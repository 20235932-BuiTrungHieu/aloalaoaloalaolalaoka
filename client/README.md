# SePay Transfer History Client

Giao diện quản lý lịch sử chuyển khoản tích hợp SePay Webhook.

## Hướng dẫn cài đặt

1. Truy cập thư mục client:
   ```bash
   cd client
   ```

2. Cài đặt các thư viện:
   ```bash
   npm install
   ```

3. Chạy ứng dụng ở chế độ phát triển:
   ```bash
   npm run dev
   ```

## Kết nối với Backend của bạn

Để kết nối với API thực tế từ Backend của bạn, hãy thực hiện các bước sau:

1. Mở file `src/services/api.js`.
2. Tìm hàm `getTransactions`.
3. Bỏ comment phần mã `axios.get` và xóa phần Mock Data:

```javascript
export const transactionService = {
  getTransactions: async () => {
    const response = await axios.get(`${API_BASE_URL}/transactions`);
    return response.data; // Đảm bảo backend trả về mảng đúng cấu trúc SePay
  }
};
```

4. Cấu hình địa chỉ API Backend trong file `.env`:
   ```text
   VITE_API_URL=http://your-backend-api.com/api
   ```

## Cấu trúc dữ liệu yêu cầu (SePay Format)

Giao diện này mong đợi dữ liệu trả về từ Backend là một mảng các đối tượng có cấu trúc:

```json
{
  "id": number,
  "gateway": "Tên ngân hàng",
  "transactionDate": "YYYY-MM-DD HH:mm:ss",
  "accountNumber": "Số tài khoản",
  "content": "Nội dung chuyển khoản",
  "transferType": "in" | "out",
  "transferAmount": number,
  "accumulated": number,
  "referenceCode": "Mã giao dịch ngân hàng"
}
```

## Công nghệ sử dụng
- React + Vite
- Vanilla CSS (Premium Design System)
- Lucide React (Icons)
- Axios (API Client)
