---
title: docker 构建多架构镜像
date: 2024-02-20
author: Hanchin Hsieh
avatar: https://avatars.githubusercontent.com/u/25029451
twitter: '@_yuchanns_'
---
[[Linux]] [[Docker]] [[Asahi]]

一直以来都是使用 Docker Desktop 进行开箱即用的多架构镜像构建，最近在 Asahi Linux
下遇到问题，才知道自助使用有一些开启步骤，记录一下。

---

### 多架构镜像有哪些构建方式
根据[文档](https://docs.docker.com/build/building/multi-platform/)描述，分为三种:

- 使用内核的 QEMU 虚拟支持
- 使用多个异构节点作为构建后端
- 在 Dockerfile 的构建阶段中使用交叉编译指令

以前工作中使用过第三种交叉编译，由于当时使用的是 Go 因此比较好解决

此次采用内核 QEMU 虚拟支持

### 启用 QEMU 跨架构镜像构建
Docker Desktop 使用的也是这个方式，并且进行了内置的支持

我们在 Linux 下直接使用 Docker Engine 需要准备外置的支持，步骤如下:

1. 通过容器为 QEMU 二进制注册 [binfmt_misc](https://en.wikipedia.org/wiki/Binfmt_misc)
    ```bash
    docker run --privileged --rm tonistiigi/binfmt --install all
    ```
    通过 `ls /proc/sys/fs/binfmt_misc/qemu*` 确认安装成功
2. 创建一个驱动使用 `docker-container` 的 `buildx` 实例并且使用:
    ```bash
    docker buildx create --name multiarch --driver docker-container --use
    ```
    命名为 `multiarch`
3. 使用 `systemctl restart docker` 重启 docker (如果不重启，接下来可能会失败)
4. 启动 `multiarch` 实例:
    ```bash
    docker buildx inspect multiarch --bootstrap
    docker buildx ls
    # NAME/NODE    DRIVER/ENDPOINT             STATUS  BUILDKIT             PLATFORMS
    # multiarch *  docker-container
    # multiarch0 unix:///var/run/docker.sock running v0.9.3               linux/arm64, linux/amd64, linux/riscv64, linux/ppc64le, linux/s390x, linux/386, linux/mips64le, linux/mips64, linux/arm/v7, linux/arm/v6
    ```
    可以看到启动了一个实例 `multiarch0` 状态为 `running` 并且支持了很多架构
5. 开始你的构建:
    ```bash
    docker buildx build --platform linux/amd64,linux/arm64 .
    ```
