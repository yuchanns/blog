---
title: 简单易懂的 Caddy 用法
date: 2023-12-07
author: Hanchin Hsieh
avatar: https://avatars.githubusercontent.com/u/25029451
twitter: '@_yuchanns_'
---

## 前提

你需要

- 一台有公网 ip 的服务器
- 该服务器对外开放了 80 和 443 端口
- 一个解析到该 ip 的域名

## 原理

利用 Caddy 的 [Request Matchers](https://caddyserver.com/docs/caddyfile/matchers)
能力将请求按**协议**和**路由**分流，以实现伪装的目的。

![Powerd by onemodel.app](https://github.com/yuchanns/blog/assets/25029451/6a2d75a2-55cc-4262-8bea-6ddfc1dffae9)

如图，针对同一个域名

- http 和 https 的下的任意流量打到服务 whoami 上
- wss 和 ws 的流量路由 `/airport` 打到 v2fly 上

这种策略下，表面上看起来该域名指向的是一个普通的 whoami 站点。

## 实现

登录到服务器，假设使用的是 Ubuntu 22.04

### 安装 Docker 系列工具

执行
```bash
sudo apt update && sudo apt install docker-compose
```
该命令会安装 docker 和 docker-compose

::: tip 题外话
安装好 docker 后执行相关的命令需要 `sudo` 权限，如果你不想每次都输入 `sudo` 可以将自身用户加入到
`docker` 组中
```bash
sudo groupadd docker
sudo usermod -aG docker $USER
```
然后重建 SSH 会话
:::

### 部署服务

我们使用 `docker-compose` 部署服务，首先创建一个部署目录并进入
```bash
mkdir ~/airport
cd ~/airport
```
目录名称可以任意。

在部署目录中创建两个文件夹和一个文件
```bash
mkdir v2ray
mkdir caddy
touch docker-compose.yaml
```
其中 `v2ray` 用于存放 v2fly 的配置，`caddy` 用于存放 caddy 的配置。

**1. 编排容器**

在 `docker-compose.yaml` 写入以下内容
```yaml
version: '3'
services:
  v2fly:
    container_name: v2fly
    restart: always
    image: v2fly/v2fly-core:v4.44.0
    networks:
    - proxy-network
    volumes:
    - ./v2ray:/etc/v2ray
  whoami:
    container_name: whoami
    restart: always
    image: traefik/whoami:v1.7.1
    networks:
    - proxy-network
  caddy:
    container_name: caddy
    restart: always
    image: caddy:2.7.5-alpine
    networks:
    - proxy-network
    volumes:
    - ./caddy:/etc/caddy
    command: ["caddy", "run", "--config", "/etc/caddy/Caddyfile"]
    ports:
    - '80:80'
    - '443:443'

networks:
  proxy-network:
    driver: bridge

```
可以看到，我们配置了三个服务和使用了网桥。

其中只有 caddy 服务对外暴露了 80 和 443 端口，用于提供网关能力。

v2fly 和 caddy 分别挂载了刚刚创建的两个配置目录。

**2. 配置 caddy**
在 caddy 配置文件夹下面创建一个配置文件 `Caddyfile`
```bash
touch ./caddy/Caddyfile
```
假设你解析到服务器的域名叫作 `caddy.example.com`

在其中写入以下内容
```Caddyfile
caddy.example.com {
    reverse_proxy whoami:80

    @websockets {
        header Connection *Upgrade*
        header Upgrade    websocket
        path /airport
    }
    reverse_proxy @websockets v2fly:17862
}
```
我们为 `caddy.example.com` 这个域名创建了配置块。

使用 `reverse_proxy` 指令将默认请求反向代理到上游服务 `whoami:80` 上。这里的 `whoami` 就是我们在
`docker-compose` 的 `services` 配置中部署的服务 `whoami` 它监听的端口是 80。

然后我们使用 `@xxx` 指令创建了一个 `Request Matcher` 块，这个匹配规则块名叫 `websockets`。

在规则块中，我们定义了要匹配的 header 是符合 websocket 请求特征的 header 头，并且需要匹配路由到
`/airport` 上(这个路由可以任意定义，只要记住 v2fly 后续会用到)。

接着使用 `reverse_proxy` 指令将匹配该规则块的流量反响代理到 `v2fly:17862` 上。

这里的 `v2fly` 是我们配置的部署服务 `v2fly` 它监听的端口可以任意定义，只要记住 v2fly 后续会用到。

**3. 配置 v2fly**
在 v2fly 配置文件夹下面创建一个配置文件 `config.json`
```bash
touch ./v2fly/config.json
```
在其中写入以下内容
```json
{
  "log": {
    "error": "",
    "loglevel": "info",
    "access": ""
  },
  "inbounds": [
    {
      "port": 17862,
      "protocol": "vmess",
      "settings": {
        "clients": [
          {
            "id": "e367138c-94ae-11ee-b9d1-0242ac120002",
            "alterId": 64
          }
        ]
      },
      "streamSettings": {
        "network": "ws",
        "wsSettings": {
          "path": "/airport"
        }
      }
    }
  ],
  "outbounds": [
    {
      "protocol": "freedom",
      "settings": {}
    }
  ]
}

```
*注意*

1. 这里的 `port` 要填写你配置 caddy v2fly 时监听的端口
2. `wsSettings.path` 的地址要填写你配置 caddy v2fly 时定义的路由
3. `clients.0.id` 是一个 `UUID` 你应该自己生成一个，而不是使用我示例里的值(后续用作客户端校验)

对于 `v2ray` 配置不作介绍，请自行翻阅官方文档。我们这里是简单地配置了一个 `vmess`
协议，将所有入流量进行自由分发。

**4. 启动服务**
执行
```bash
docker-compose up -d
```
启动所有服务。

首先查阅 Caddy 的日志

```bash
docker logs -f caddy
```
可以看到 caddy 正常启动了，并且自动进行证书获取，为你的域名配置了证书。

通过浏览器访问 `caddy.example.com` 可以得到 `whoami` 的响应

![whoami](https://github.com/yuchanns/blog/assets/25029451/f560fb5c-4a32-4e94-86c3-6cfc7f1e4775)

并且协议是 `HTTPS`。

## 使用
接下来，我们要在客户端检验一下分流到 v2fly 是否生效。

在你的客户端电脑上，还是以使用 `docker-compose` 创建 `clash` 为例
首先创建一个部署 `clash` 的目录并在其中创建相应的配置目录
```bash
mkdir ~/clash
cd clash
mkdir config
touch docker-compose.yaml
touch ./config/config.yaml
```
然后在 `docker-compose.yaml` 编排容器
```yaml
version: '3'
services:
  clash:
    container_name: clash
    restart: always
    image: dreamacro/clash:v1.13.0
    networks:
    - proxy-network
    ports:
    - '7891:7891'
    - '7890:7890'
    - '9090:9090'
    volumes:
    - ./config:/root/.config/clash

networks:
  proxy-network:
    driver: bridge

```
接着编写 `clash` 的配置
```yaml
# HTTP 端口
port: 7890

# SOCKS5 端口
socks-port: 7891

allow-lan: true

bind-address: "*"

# Rule / Global / Direct (默认为 Rule 模式)
mode: Rule

# 设置输出日志的等级 (默认为 info)
# info / warning / error / debug / silent
log-level: info

# RESTful API for clash
external-controller: 0.0.0.0:9090

proxies:
# 支持的协议及加密算法示例请查阅 Clash 项目 README 以使用最新格式：https://github.com/Dreamacro/clash/blob/master/README.md

# VMess
- name: "v2fly"
  type: vmess
  server: caddy.example.com
  port: 443
  uuid: e367138c-94ae-11ee-b9d1-0242ac120002
  alterId: 0
  cipher: auto
  udp: true
  tls: true
  # skip-cert-verify: true
  tls-hostname: caddy.example.com
  network: ws
  ws-opts:
    path: /airport
    headers:
      Host: caddy.example.com

# 代理组策略
proxy-groups:

# url-test 通过指定的 URL 测试并选择延迟最低的节点
- name: "自动选择快速节点"
  type: url-test
  proxies:
    - "v2fly"
  url: 'http://www.gstatic.com/generate_204'
  interval: 300

# 代理节点选择
- name: "PROXY"
  type: select
  proxies:
    - "自动选择快速节点"
# 白名单模式 PROXY，黑名单模式 DIRECT
- name: "Final"
  type: select
  proxies:
    - "DIRECT"

# 规则
rules:
- DOMAIN-SUFFIX,google.com,PROXY
```
需要注意
- `server`, `tls-hostname` 和 `ws-opts.headers.Host` 需要填写前面配置的域名
- `uuid` 需要填写前面配置的 UUID 用于校验
- `udp` 和 `tls` 需要设置为 `true`
- `network` 需要设置为 `ws`
- `ws-opts.path` 需要填写前面配置的路由

启动服务
```bash
docker-compose up -d
```
然后在终端设置 HTTP 代理，并使用 `curl` 请求 Google
```bash
export HTTPS_PROXY=http://0.0.0.0:7890
curl -i -L https://google.com
```
可以看到响应成功。

## 异常解决
[待续...]
