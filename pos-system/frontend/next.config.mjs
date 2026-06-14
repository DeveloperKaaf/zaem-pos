/** @type {import('next').NextConfig} */
const nextConfig = {
    output: 'export',
    images: {
        unoptimized: true,
    },
    typescript: {
        // تجاهل أخطاء TypeScript أثناء البناء لضمان التشغيل الفعلي السريع
        ignoreBuildErrors: true,
    },
    eslint: {
        // تجاهل أخطاء ESLint أثناء البناء
        ignoreDuringBuilds: true,
    },
};

export default nextConfig;
