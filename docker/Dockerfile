FROM ubuntu:24.04

# 1. 替换腾讯云内网源
RUN sed -i "s@http://.*archive.ubuntu.com@http://mirrors.tencentyun.com@g" /etc/apt/sources.list.d/ubuntu.sources && \
    sed -i "s@http://.*security.ubuntu.com@http://mirrors.tencentyun.com@g" /etc/apt/sources.list.d/ubuntu.sources

# 2. 极致精简依赖 (剔除 pip 和 vim，仅保留纯执行环境和必要工具)
# 使用 ARG 保证 noninteractive 不会泄漏到最终容器内
ARG DEBIAN_FRONTEND=noninteractive
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl git jq ca-certificates ripgrep sudo \
    python3 python3-venv \
    && apt-get autoremove -y \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/* /var/cache/apt/archives/*

# 3. 安装极速包管理器 uv
RUN curl -LsSf https://astral.sh/uv/install.sh | env UV_INSTALL_DIR="/usr/local/bin" sh

# 4. 健壮的动态对齐 UID 与提权
ARG HOST_UID=1000
RUN (id -u agent >/dev/null 2>&1 && echo "agent user exists") || \
    (useradd -m -d /home/agent -s /bin/bash -u ${HOST_UID} agent 2>/dev/null || useradd -m -d /home/agent -s /bin/bash agent) && \
    echo "agent ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers

# 初始化工作目录
RUN mkdir -p /workspace && chown -R agent:agent /workspace
USER agent

# 5. 注入腾讯云内网 PyPI 镜像配置
RUN mkdir -p /home/agent/.config/uv && \
    echo 'index-url = "http://mirrors.tencentyun.com/pypi/simple"\n\
allow-insecure-host = ["mirrors.tencentyun.com"]' > /home/agent/.config/uv/uv.toml

WORKDIR /workspace

# 挂起容器
CMD ["tail", "-f", "/dev/null"]