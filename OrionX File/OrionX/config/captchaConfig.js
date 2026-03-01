import dotenv from 'dotenv';
dotenv.config();

export const getCaptchaConfig = () => {
    const captchas = [];
    for (let i = 1; i <= 5; i++) {
        const image = process.env[`CAPTCHA_${i}_IMAGE_URL`];
        const answer = process.env[`CAPTCHA_${i}_ANSWER`];

        if (image && answer) {
            captchas.push({
                id: i,
                image,
                answer
            });
        }
    }
    return captchas;
};

export const ADMIN_ID = process.env.ADMIN_ID || '1045550030423085057';
