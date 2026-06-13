module.exports = {
  apps: [
    {
      name: 'zaem-backend',
      script: 'npm',
      args: 'run start:dev',
      // تفعيل الـ shell ضروري جداً في ويندوز لتشغيل npm.cmd
      shell: true,
      watch: false,
      env: {
        NODE_ENV: 'development',
      },
    },
  ],
};
