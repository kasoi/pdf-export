module.exports = {
    apps : [{
      name: "pdf-export",
      script: "npm start",
      instances: 1,
      cron_restart: "0 0 * * *",
      max_memory_restart: "300M"
    }]
  }