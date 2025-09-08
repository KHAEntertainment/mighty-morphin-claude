FROM mcr.microsoft.com/devcontainers/typescript-node:1-20-bullseye

# Install system dependencies for keytar (libsecret)
RUN apt-get update && apt-get install -y \
    libsecret-1-dev \
    python3-dev \
    build-essential \
    && rm -rf /var/lib/apt/lists/*
