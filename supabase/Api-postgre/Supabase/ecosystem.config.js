module.exports = {
  apps: [{
    name: "supabase-api",
    script: "./venv/bin/python",
    args: "api.py",
    cwd: "/root/ema-software/API/Supabase",
    interpreter: "",
    env: {
      NODE_ENV: "production",
    },
    watch: false,
    instances: 1,
    exec_mode: "fork",
    autorestart: true,
    max_restarts: 10,
    restart_delay: 5000
  }]
};
