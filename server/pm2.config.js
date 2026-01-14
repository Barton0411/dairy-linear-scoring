module.exports = {
  apps: [{
    name: 'dairy-scoring-api',
    script: './src/app.js',
    instances: 2,
    exec_mode: 'cluster',

    // 环境变量
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },

    // 日志配置
    error_file: './logs/error.log',
    out_file: './logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,

    // 重启策略
    max_memory_restart: '500M',
    autorestart: true,
    watch: false,
    max_restarts: 10,
    min_uptime: '10s',

    // 启动配置
    wait_ready: true,
    listen_timeout: 10000,
    kill_timeout: 5000,

    // 进程管理
    instance_var: 'INSTANCE_ID',

    // 优雅关闭
    shutdown_with_message: true
  }]
}
