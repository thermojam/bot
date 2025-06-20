import YooKassa from 'yookassa';

const shopId = process.env.YOOKASSA_SHOP_ID;
const secretKey = process.env.YOOKASSA_SECRET_KEY;

const yookassa = new YooKassa({ shopId, secretKey });
export default yookassa;
