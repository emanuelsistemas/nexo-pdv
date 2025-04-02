module.exports = {
  apps: [{
    name: "nexo-pdv-dev",
    script: "npm",
    args: "run dev",
    cwd: "/root/nexo-pdv",
    env: {
      NODE_ENV: "development",
    },
    watch: false,
    instances: 1,
    exec_mode: "fork",
    autorestart: true,
    max_restarts: 10,
    restart_delay: 5000
  }]
};
