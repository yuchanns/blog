---
title: 在 docker 中挂载 rclone
date: 2024-01-07
author: Hanchin Hsieh
avatar: https://avatars.githubusercontent.com/u/25029451
twitter: '@_yuchanns_'
---
[[Linux|linux]] [[Container|container]]

在去年双11我购买了足足 20T 的阿里云盘，计划用于我的 K8s NAS 存储，但一直没有空配置。

我原本打算先为 OpenDAL 添加一个 AliyunDriver 的支持，然后经过 FUSE
来实现读写，不过近期群友告诉我 RClone 也有相关支持 (Alist)。于是我先使用 Docker 进行了体验，并在此记录配置过程。

本文不会解释原理等内容，仅是作为一个**备忘录**，毕竟官方文档看了容易犯迷糊。

---

## 前提条件

- 你需要配置一个 [Alist](https://alist-doc.nn.ci/en/docs/install/docker) ，它的功能是提供 webdav 协议，然后连接你的阿里云盘。假设 Alist 站点地址是 `http://localhost:5244/dav`
- 宿主机上安装了 **FUSE**
- Docker [安装](https://rclone.org/docker/)了 RClone 插件

## 步骤

1. 首先我们需要对 RClone 进行配置使其能够连接 alist-webdav 。需要注意的是，由于我们配置的是
   Docker 的插件，所以 RClone 的配置应该存储在 `/var/lib/docker-plugins/rclone/config`
   而不是宿主机的 `~/.config/rclone` 中。

   即我们需要先在任意机器上执行 `rclone config`
   命令进行配置，输入你的 webdav 地址和账号密码。然后把 `~/.config/rclone/rclone.conf` 文件复制到 `/var/lib/docker-plugins/rclone/config`。

   参考内容是:
    ```toml
    [alist-dav]
    type = webdav
    url = http://localhost:5244/dav
    vendor = other
    user = YOU_USER
    pass = YOU_PASS_ENCRYPTED
    ```
   注意这里的账号和密码就是你 Alist
   站点登录使用的账号密码。密码是经过 RClone 加密的密文。
2. 然后在我们的 docker-compose 中配置 volumes 并且在容器中引用:
    ```yaml
    version: '3'
    services:
      nastools:
        container_name: nastools
        restart: always
        image: diluka/nas-tools:2.9.1
        ports:
        - '3000:3000'
        volumes:
        - alist-dav:/media/link
        environment:
          NASTOOL_AUTO_UPDATE: "false"
          NASTOOL_CN_UPDATE: "false"
    volumes:
      alist-dav:
        driver: rclone:latest
        driver_opts:
          remote: "alist-dav:/aliyun"
          vfs-cache-mode: full
          vfs-cache-max-size: 1G
          poll-interval: 0
          uid: 1000
          gid: 1000
          allow_other: "true"
    ```
    可以看到，我们这里配置了一个 RClone 的卷，注意 *remote* 这一栏填写的是我们前面配置的 `alist-dav` 小节，后面是阿里云盘在你的 Alist 中的路径。然后我们在 **nas-tool** 中使用这个卷
3. 执行 `docker-compose up -d` 就可以看到一切顺利启动。进入到容器中对应的目录也可以直接查看
   AliyunDriver 的内容。

## 扩展-CSI Driver

体验了 Docker 方案后感觉使用挺简单的，于是又研究了下在 K8s 中如何配置。

这里选取的是 [CSI Driver 方案](https://github.com/wunderio/csi-rclone)。

使用方式很简单:

1. 首先将仓库 clone 到本地
2. 然后注意将 `./deploy/kubernetes/1.19` 中两处引用 `wunderio/csi-rclone:v1.3.1` 的镜像改成 `ghcr.io/philstevenson/csi-rclone:v1.3.2`。这是由于官方仓库使用的 FUSE 还是2，不支持挂载 webdav 而会报错，[社区](https://github.com/wunderio/csi-rclone/pull/46)提供了升级镜像(已合并入主分支但未发布)
3. 然后将其应用到 K8s 中 `kubectl apply -f ./deploy/kubernetes/1.19`
4. 分别创建一个 pv 资源
    ```yaml
    kind: PersistentVolume
    apiVersion: v1
    metadata:
      name: aliyun-dav
    spec:
      accessModes:
      - ReadWriteMany
      capacity:
        storage: 20000Gi
      storageClassName: rclone
      csi:
        driver: csi-rclone
        volumeHandle: data-id
        volumeAttributes:
          remote: "alist-dav"
          remotePath: "/aliyun"
          configData: |
            [alist-dav]
            type = webdav
            url = http://ALIST_HOST:5244/dav
            vendor = other
            user = YOU_USER
            pass = YOU_PASS_ENCRYPTED
    ```
    和一个 pvc 资源
    ```yaml
    apiVersion: v1
    kind: PersistentVolumeClaim
    metadata:
      name: aliyun-dav
      namespace: YOU_NS
    spec:
      accessModes:
        - ReadWriteMany
      resources:
        requests:
          storage: 20000Gi
      storageClassName: rclone
      volumeName: aliyun-dav
    ```
    注意这里的 url 是你的 Alist 在 K8s 中的 svc 。另外要注意 pvc 的命名空间和你的服务保持相同。

    使用 `kubectl get pv` 和 `kubectl get pvc` 查看创建情况
5. 在对应的命名空间里的 deploy 中使用该 pvc 请参考 [K8s 文档](https://kubernetes.io/docs/tasks/configure-pod-container/configure-persistent-volume-storage/#create-a-pod)这里不作展开。如果查看日志发现容器创建失败并且提示 `mount not ready` 错误，有很大可能是上一步没有替换镜像，使用的还是低版本的 FUSE 导致的
