module.exports = {
  apps: [
    {
      name: "nenxo-pdv-dev",
      script: "pnpm",
      args: "run dev",
      cwd: "/root/ema-software/nenxo-pdv",
      env: {
        NODE_ENV: "development",
        PORT: 5002
      },
      watch: false,
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      max_restarts: 10,
      restart_delay: 5000
    },
    {
      name: "nenxo-pdv-prod",
      script: "pnpm",
      args: "run preview",
      cwd: "/root/ema-software/nenxo-pdv",
      env: {
        NODE_ENV: "production",
        PORT: 5000
      },
      watch: false,
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      max_restarts: 10,
      restart_delay: 5000
    }
  ]
};
