/**
 * Battle GIF Configuration for 1v1 Pet Battles
 * Thay thế canvas bằng GIF animations cho từng lượt đánh
 * 
 * GIF PLACEHOLDER - Thay link GIF vào các vị trí tương ứng
 * Mỗi loại action có nhiều GIF để random, tránh lặp lại
 */

// ===== GIF CƠ BẢN CHO CÁC HÀNH ĐỘNG BATTLE =====
export const BATTLE_GIFS = {
    // ========== ATTACK GIFS ==========
    // Tấn công thường - RANDOM từ nhiều hiệu ứng
    normalAttack: [
        // Hiệu ứng đấm/đánh thường - tay đấm, vung kiếm
        'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExdmk4ZHc5MjNqc2J3N3BiNTJxdTFnbzZuZnhrOHBwb2F5Z2IxcTJ3cCZlcD12MV9naWZzX3NlYXJjaCZjdD1n/JRiAeFnqoFLtrHqttI/giphy.gif',          // Hiệu ứng đấm mạnh, shock wave
        'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExdmk4ZHc5MjNqc2J3N3BiNTJxdTFnbzZuZnhrOHBwb2F5Z2IxcTJ3cCZlcD12MV9naWZzX3NlYXJjaCZjdD1n/A8UFISckEbokw/giphy.gif',          // Hiệu ứng đấm liên hoàn
        'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExdmk4ZHc5MjNqc2J3N3BiNTJxdTFnbzZuZnhrOHBwb2F5Z2IxcTJ3cCZlcD12MV9naWZzX3NlYXJjaCZjdD1n/kp24ItKtxYWcZWixzj/giphy.gif',          // Chém kiếm ngang
        'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExdmk4ZHc5MjNqc2J3N3BiNTJxdTFnbzZuZnhrOHBwb2F5Z2IxcTJ3cCZlcD12MV9naWZzX3NlYXJjaCZjdD1n/iR6kCwjEx7hXInz2bp/giphy.gif',          // Chém kiếm chéo
        'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExdmk4ZHc5MjNqc2J3N3BiNTJxdTFnbzZuZnhrOHBwb2F5Z2IxcTJ3cCZlcD12MV9naWZzX3NlYXJjaCZjdD1n/s92ot4IuyLAX88AIvr/giphy.gif',          // Chém kiếm dọc từ trên xuống

        // Hiệu ứng lửa
        'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExdmk4ZHc5MjNqc2J3N3BiNTJxdTFnbzZuZnhrOHBwb2F5Z2IxcTJ3cCZlcD12MV9naWZzX3NlYXJjaCZjdD1n/iRDkNp3c0FXem0lCCF/giphy.gif',           // Quả cầu lửa bay vèo
        'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExdmk4ZHc5MjNqc2J3N3BiNTJxdTFnbzZuZnhrOHBwb2F5Z2IxcTJ3cCZlcD12MV9naWZzX3NlYXJjaCZjdD1n/R9TbpugxAhx9UnerhD/giphy.gif',           // Ngọn lửa bùng cháy
        'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExdmk4ZHc5MjNqc2J3N3BiNTJxdTFnbzZuZnhrOHBwb2F5Z2IxcTJ3cCZlcD12MV9naWZzX3NlYXJjaCZjdD1n/v1ykXkJdLD7tMWvIim/giphy.gif',           // Tia lửa phun ra

        // Hiệu ứng sấm sét
        'https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3dXhsaHA4bDhvbXk0dTZ2eTZ3MWVmYTRzeWsxM3FqZ21jdGU0ODR3byZlcD12MV9naWZzX3JlbGF0ZWQmY3Q9Zw/e7rivhaQoYxIoPEuLf/giphy.gif',        // Sét đánh xuống
        'https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3dXhsaHA4bDhvbXk0dTZ2eTZ3MWVmYTRzeWsxM3FqZ21jdGU0ODR3byZlcD12MV9naWZzX3JlbGF0ZWQmY3Q9Zw/GwwPMD7TOqLPocyjrT/giphy.gif',        // Tia điện phóng ra
        'https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3a2xpdWRzcGFxMmd6ZDIybHFpYXdocHdjNXVoNmNzczEzenJicWI3aCZlcD12MV9naWZzX3JlbGF0ZWQmY3Q9Zw/PoOxu7k42lxGeTeUIv/giphy.gif',        // Cầu sét nổ tung

        // Hiệu ứng nước/băng
        'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExdmk4ZHc5MjNqc2J3N3BiNTJxdTFnbzZuZnhrOHBwb2F5Z2IxcTJ3cCZlcD12MV9naWZzX3NlYXJjaCZjdD1n/s92ot4IuyLAX88AIvr/giphy.gif',          // Sóng nước đánh tới
        'https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3dXhsaHA4bDhvbXk0dTZ2eTZ3MWVmYTRzeWsxM3FqZ21jdGU0ODR3byZlcD12MV9naWZzX3JlbGF0ZWQmY3Q9Zw/7qpw2CASg1c9lPb8rv/giphy.gif',            // Mũi tên băng bay đi
        'https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3a2xpdWRzcGFxMmd6ZDIybHFpYXdocHdjNXVoNmNzczEzenJicWI3aCZlcD12MV9naWZzX3JlbGF0ZWQmY3Q9Zw/NE17WYZYMmp1kLM5MM/giphy.gif',            // Đóng băng freeze

        // Hiệu ứng gió/không khí
        'https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3a2xpdWRzcGFxMmd6ZDIybHFpYXdocHdjNXVoNmNzczEzenJicWI3aCZlcD12MV9naWZzX3JlbGF0ZWQmY3Q9Zw/qpV7dzKDIRjWrW72St/giphy.gif',           // Lốc xoáy nhỏ
        'https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3dXhsaHA4bDhvbXk0dTZ2eTZ3MWVmYTRzeWsxM3FqZ21jdGU0ODR3byZlcD12MV9naWZzX3JlbGF0ZWQmY3Q9Zw/cSiyoies9SJC1q0oTH/giphy.gif',           // Sóng không khí impact

        // Hiệu ứng đất/đá
        'https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3a2xpdWRzcGFxMmd6ZDIybHFpYXdocHdjNXVoNmNzczEzenJicWI3aCZlcD12MV9naWZzX3JlbGF0ZWQmY3Q9Zw/KDjSlXXcczEsfll7pi/giphy.gif',          // Đá bay lên đập
        'https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3a2xpdWRzcGFxMmd6ZDIybHFpYXdocHdjNXVoNmNzczEzenJicWI3aCZlcD12MV9naWZzX3JlbGF0ZWQmY3Q9Zw/JnZw8mzStIlRtRehLn/giphy.gif',          // Mặt đất nứt

        // Hiệu ứng năng lượng/ma thuật
        'https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3a2xpdWRzcGFxMmd6ZDIybHFpYXdocHdjNXVoNmNzczEzenJicWI3aCZlcD12MV9naWZzX3JlbGF0ZWQmY3Q9Zw/BGDKLqbJ48Lau0KAOc/giphy.gif',         // Quả cầu năng lượng
        'https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3Y2FoZGoxOGNvY2tkYmhyaDcyMjB1OGkwMzBxNGFidjY4cG0zNmlxbiZlcD12MV9naWZzX3JlbGF0ZWQmY3Q9Zw/UMrATgEJRqxIZ9F1dv/giphy.gif',         // Tia laser bắn ra
        'https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3Y2FoZGoxOGNvY2tkYmhyaDcyMjB1OGkwMzBxNGFidjY4cG0zNmlxbiZlcD12MV9naWZzX3JlbGF0ZWQmY3Q9Zw/kp24ItKtxYWcZWixzj/giphy.gif',          // Hiệu ứng ma thuật tím
        'https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3Y2FoZGoxOGNvY2tkYmhyaDcyMjB1OGkwMzBxNGFidjY4cG0zNmlxbiZlcD12MV9naWZzX3JlbGF0ZWQmY3Q9Zw/g1sZGvI2vbB6FQZmne/giphy.gif'           // Hiệu ứng ma thuật xanh
    ],

    // ========== CRITICAL HIT GIFS ==========
    // Đánh chí mạng - Hiệu ứng mạnh hơn, hoành tráng hơn
    criticalHit: [
        'https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3dXhsaHA4bDhvbXk0dTZ2eTZ3MWVmYTRzeWsxM3FqZ21jdGU0ODR3byZlcD12MV9naWZzX3JlbGF0ZWQmY3Q9Zw/A1SdT80P3HY6u1HTKg/giphy.gif',        // Nổ lớn, shock wave
        'https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3YnE4Z2J5YTZpbnVvZXkwMTV1dWJ0bzUwcDg4cTIwcXU0b2MzeTkzbSZlcD12MV9naWZzX3JlbGF0ZWQmY3Q9Zw/mWeDPFbZvTc2303gHC/giphy.gif',        // Vụ nổ rung chuyển
        'https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3dHZrNWptaWhzampobzgzZGptemx6amozcWVyMDB5d3YyY2phZDB2ZCZlcD12MV9naWZzX3JlbGF0ZWQmY3Q9Zw/nHwwNbFKZbMTEzqlfF/giphy.gif',            // Chém cực mạnh ánh sáng
        'https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3aW9wbm96d2U5eXhwdG1mc3Z0NGE2Mjh5N2M0eWNveHlvZmdhcnhjMyZlcD12MV9naWZzX3JlbGF0ZWQmY3Q9Zw/yxiMuqnwkhAk5lX1T6/giphy.gif',            // Nhát chém xé không gian
        'https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3aW9wbm96d2U5eXhwdG1mc3Z0NGE2Mjh5N2M0eWNveHlvZmdhcnhjMyZlcD12MV9naWZzX3JlbGF0ZWQmY3Q9Zw/oDCgaEnCuGxNCtdfOK/giphy.gif',             // Bùng cháy cực đại
        'https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3aWlvdTJnYXJvZWRwMnE4a2swcjZodTNucXg2b2d6MzE2NW1teGEzdCZlcD12MV9naWZzX3JlbGF0ZWQmY3Q9Zw/4CXlGRVY93314DkY0M/giphy.gif',          // Sét đánh long trời
        'https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3aW9wbm96d2U5eXhwdG1mc3Z0NGE2Mjh5N2M0eWNveHlvZmdhcnhjMyZlcD12MV9naWZzX3JlbGF0ZWQmY3Q9Zw/bEWZ7Q23E0OUZuRsKC/giphy.gif',           // Hiệu ứng va chạm mạnh
        'https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3dHZrNWptaWhzampobzgzZGptemx6amozcWVyMDB5d3YyY2phZDB2ZCZlcD12MV9naWZzX3JlbGF0ZWQmY3Q9Zw/gkC8aSZpZoF0G6EdZ8/giphy.gif',           // Screen shake epic
        'https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3anFrMTU0YWlyYjQ5ZDY1d2xkdHN4Y2h6emxnNGZ5Z3FwdXhna3BieiZlcD12MV9naWZzX3JlbGF0ZWQmY3Q9Zw/M3MSOtFBm46ZrJ6ZmJ/giphy.gif',            // Super attack anime style
        'https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3anFrMTU0YWlyYjQ5ZDY1d2xkdHN4Y2h6emxnNGZ5Z3FwdXhna3BieiZlcD12MV9naWZzX3JlbGF0ZWQmY3Q9Zw/Ri3j3y8GOpgGVHwsyc/giphy.gif'             // Final blow cực chất
    ],

    // ========== MISS ATTACK GIFS ==========
    // Trượt đòn/né tránh
    missAttack: [
        'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExdmdpMXhrZzZxYnBwNXBiZDU3YW1iNjUyam9oZGxrZHgxd3o3bzlyNSZlcD12MV9naWZzX3NlYXJjaCZjdD1n/rJCinmkwVOfouzNJht/giphy.gif',            // Né nhanh sang bên
        'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExdmdpMXhrZzZxYnBwNXBiZDU3YW1iNjUyam9oZGxrZHgxd3o3bzlyNSZlcD12MV9naWZzX3NlYXJjaCZjdD1n/59IjtCaRAcQiaj19mU/giphy.gif',            // Biến mất rồi hiện lại
        'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExdmdpMXhrZzZxYnBwNXBiZDU3YW1iNjUyam9oZGxrZHgxd3o3bzlyNSZlcD12MV9naWZzX3NlYXJjaCZjdD1n/SeazCAa6TZdJfd2Sl4/giphy.gif',            // Chém trượt, gió thoảng
        'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExdmdpMXhrZzZxYnBwNXBiZDU3YW1iNjUyam9oZGxrZHgxd3o3bzlyNSZlcD12MV9naWZzX3NlYXJjaCZjdD1n/YOQdvwX3oFBLxxMyoH/giphy.gif',            // Vung tay trượt
        'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExdmdpMXhrZzZxYnBwNXBiZDU3YW1iNjUyam9oZGxrZHgxd3o3bzlyNSZlcD12MV9naWZzX3NlYXJjaCZjdD1n/H9bd2uN7z8BPaWSOfN/giphy.gif',            // Khói bụi, không trúng ai
        'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExdmdpMXhrZzZxYnBwNXBiZDU3YW1iNjUyam9oZGxrZHgxd3o3bzlyNSZlcD12MV9naWZzX3NlYXJjaCZjdD1n/Ryim7YTIm571NRGRth/giphy.gif'          // Dịch chuyển né
    ],

    // ========== DEFEND GIFS ==========
    // Phòng thủ/hồi máu
    defend: [
        'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExZm00a3BuM3hobm5vaTE4amlmdmUxdXk0NGxkNjJxNndkOXluOWlvdSZlcD12MV9naWZzX3NlYXJjaCZjdD1n/uwGkw8WIo3V6v0zdvi/giphy.gif',         // Khiên năng lượng bảo vệ
        'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExMjR3bmw5ZWpraWUwb2Uydnl4d2Y3bzU0YThmdnB3NG9pZ3B0YmFrMiZlcD12MV9naWZzX3NlYXJjaCZjdD1n/fVXs8zyBrE1hTg7n5Q/giphy.gif',         // Khiên phép thuật xoay
        'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExMjR3bmw5ZWpraWUwb2Uydnl4d2Y3bzU0YThmdnB3NG9pZ3B0YmFrMiZlcD12MV9naWZzX3NlYXJjaCZjdD1n/xMXNxDknygTTgbWDBS/giphy.gif',         // Barrier ánh sáng
        'https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3cTU4N2EyNmx4MTczZDZlemJuM2twZzJjcXVuMjZ4aXp3d2dzZDUwcyZlcD12MV9naWZzX3NlYXJjaCZjdD1n/U27pUaTyHOsar2etto/giphy.gif',          // Chắn đòn bằng tay
        'https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3cTU4N2EyNmx4MTczZDZlemJuM2twZzJjcXVuMjZ4aXp3d2dzZDUwcyZlcD12MV9naWZzX3NlYXJjaCZjdD1n/ThXyZkBa2rl4te8fVQ/giphy.gif',          // Đỡ đòn bằng vũ khí
        'https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3OXZrM3QzMnhlNDR3d2ZuOXBhNnViZzk3dDNvdmM3dTA3ajNydTYxcCZlcD12MV9naWZzX3NlYXJjaCZjdD1n/Yy2OlBJ3oDCNuux3wj/giphy.gif',           // Ánh sáng hồi máu
        'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExMjR3bmw5ZWpraWUwb2Uydnl4d2Y3bzU0YThmdnB3NG9pZ3B0YmFrMiZlcD12MV9naWZzX3NlYXJjaCZjdD1n/etBKy4Nog4MvI6JXxf/giphy.gif',           // Hào quang chữa lành
        'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExMjR3bmw5ZWpraWUwb2Uydnl4d2Y3bzU0YThmdnB3NG9pZ3B0YmFrMiZlcD12MV9naWZzX3NlYXJjaCZjdD1n/r8AfZVsBLXWtPYLoJP/giphy.gif',           // Aura phòng thủ bao quanh
        'https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3emdiZm1sY202cGVreG01ZXlneTJma2xoZHUzbjZrMTFqNmgwYXZ4ciZlcD12MV9naWZzX3NlYXJjaCZjdD1n/Im6wZI9nMzDXg7ZxR1/giphy.gif'           // Giáp cứng xuất hiện
    ],

    // ========== SKILL GIFS ==========
    // Kỹ năng đặc biệt - Hiệu ứng hoành tráng
    skill: [
        'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExaGVkc3dsM21sODFwZ3Y2cWtiZjFwdG1hcm0yZHJyNXczMTlidDNlZCZlcD12MV9naWZzX3NlYXJjaCZjdD1n/nvyq66S9bvrMS2xhFP/giphy.gif',        // Ultimate skill cực mạnh
        'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExaGVkc3dsM21sODFwZ3Y2cWtiZjFwdG1hcm0yZHJyNXczMTlidDNlZCZlcD12MV9naWZzX3NlYXJjaCZjdD1n/JXH8A0hThhd4EIffnT/giphy.gif',        // Đòn tuyệt kỹ
        'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExamw2MDc4cm9icTl3MGF0dzhwZjV0YXZjMGVzdnl4NTB4ejlvbnAyNyZlcD12MV9naWZzX3NlYXJjaCZjdD1n/ejgzhqJs3X0Ggj3fz9/giphy.gif',            // Chiêu lửa đặc biệt
        'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExdGRxODl2MHJuanl5NWJrdjdka2IyZ3VmeTV1azJjaTQ0bGhtaWpxdiZlcD12MV9naWZzX3NlYXJjaCZjdD1n/A5nMYFXMrBTBxcTjLB/giphy.gif',             // Chiêu băng đặc biệt
        'https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3ZmF1OWh4NW90ZGY5cmczbzJrb3lwdzBjZWcyMTgxcjVpZ2p3azVqMSZlcD12MV9naWZzX3NlYXJjaCZjdD1n/OwAhrQG07cFtEXNLHt/giphy.gif',         // Chiêu sét đặc biệt
        'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExMGIycjI2OWRmMWFqdG13aGZicDF2cjN3Mm9uNnAzNGt5dTE0NXBpYyZlcD12MV9naWZzX3NlYXJjaCZjdD1n/uoevgFl2y4FdauPbTq/giphy.gif',            // Ma thuật hắc ám
        'https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3OXBjOGNmb3BlemF2a295dmJqdTJ3eWZoNDJ3MHg4OWRsNjAzM3I2OCZlcD12MV9naWZzX3NlYXJjaCZjdD1n/Hw0wIr1YL75VC/giphy.gif',           // Ma thuật ánh sáng
        'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExM3Ezd2Q5anUwN3k1Nnd1aGF6OWV3MDEwZmN1ajF2b2Y1enp6am5qNyZlcD12MV9naWZzX3NlYXJjaCZjdD1n/VDX1tlqhxzeGWKaUzt/giphy.gif',          // Triệu hồi quái vật
        'https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3ZnQ0b250aXd1N2twajhsdWZ0ZDd1ajVrZTl4d28zZXpoMWJ1ZHNxNCZlcD12MV9naWZzX3NlYXJjaCZjdD1n/r88w2d7tHqazFwNEGN/giphy.gif',            // Tia năng lượng cực mạnh
        'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExa2JrdGI0OXU5OGxoenRsMGdwbGxyd2JveHZzMmRuNWU4bnB1OGFwNCZlcD12MV9naWZzX3NlYXJjaCZjdD1n/SSCjvA2sg8HiKywGtt/giphy.gif'            // Combo attack liên hoàn
    ],

    // ========== VICTORY GIF ==========
    victory: [
        'https://media.giphy.com/media/Y3qaJQjDcbJPyK7kGk/giphy.gif'
    ],

    // ========== DEFEAT GIF ==========
    defeat: [
        'https://media.giphy.com/media/eJ4j2VnYOZU8qJU3Py/giphy.gif'
    ],

    // ========== BATTLE START GIF ==========
    battleStart: [
        'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExNjhwYmNqbHJ6M3VxdHVtd2FyMnduYWtmYTc4NHl4OHh5NXZ1c3g1MCZlcD12MV9naWZzX3NlYXJjaCZjdD1n/cNFFHJ5Ki8KBJbS2Lt/giphy.gif'            // Intro battle bắt đầu
    ],

    // ========== PET SWITCH GIF ==========
    // Khi pet bị hạ gục và đổi pet mới
    petSwitch: [
        'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExMXRybDQwYXNqd3E1dXNuZWlvbTlhcnhyMDk4dWV5MGZoYXUwMDMwbSZlcD12MV9naWZzX3NlYXJjaCZjdD1n/gPzoc6K5t7cE08Mksr/giphy.gif',          // Pet ngã xuống
        'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExYmIwcHQ4OHB1ZjV6b2tyNTBvOW92a3p6aHBoOTF5M21sOHE1YmF5YyZlcD12MV9naWZzX3NlYXJjaCZjdD1n/rHUlebSKPlMVwPPdpT/giphy.gif',          // Pet biến mất
        'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExcGkyN25leTEzcWU1MHBkNzNsYWhwc2N3OHRhODVvMm1zczFnd3F0bCZlcD12MV9naWZzX3NlYXJjaCZjdD1n/47D5jukgxqctwduJKQ/giphy.gif',         // Pet mới xuất hiện
        'https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3djRpa3B5cjl1b204M2Q1ZGU5ZmNiNjdhdm9nMWJqNmZmMWJqdTIwdyZlcD12MV9naWZzX3NlYXJjaCZjdD1n/o076Oyt6oeFcFObXgm/giphy.gif'          // Portal mở, pet bay ra
    ]
};

// ===== GIF KỸ NĂNG ĐẶC BIỆT CHO TỪNG PET =====
// Skill của từng pet - bạn có thể thêm GIF riêng cho từng con
export const PET_SKILL_GIFS = {
    // === COMMON ===
    slime: {
        name: "Toxic Splash",
        description: "Phun chất độc gây sát thương +50%",
        damage: 1.5,
        gif: 'https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3OGYwZmFvZGsya2doNzJwNnZtNms4bXB6aHJrd2NoaXE0NHozMDhwZCZlcD12MV9naWZzX3NlYXJjaCZjdD1n/uOU9gua9nugXirZicd/giphy.gif'          // Chất nhớt độc phun ra, màu xanh lá
    },
    rat: {
        name: "Plague Bite",
        description: "Cắn nhiễm độc gây sát thương +40%",
        damage: 1.4,
        gif: 'https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3dHIycDJ3M3Rhcjl4N295am5vNGRxYW1tNHljeWpibmFiYTRzNTN1OCZlcD12MV9naWZzX3NlYXJjaCZjdD1n/6dz8v1aSHvvQL7vFW7/giphy.gif'            // Răng cắn, hiệu ứng độc
    },
    bat: {
        name: "Sonic Screech",
        description: "Tiếng kêu xuyên tai gây sát thương +45%",
        damage: 1.45,
        gif: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExcWxhOWRhc3BvZW5kNXYxOHc1MDl4Z3d0Z3NwZHpzMWp1N3ludDhzbiZlcD12MV9naWZzX3NlYXJjaCZjdD1n/A8UFISckEbokw/giphy.gif'            // Sóng âm thanh phát ra
    },
    frog: {
        name: "Tongue Lash",
        description: "Đòn lưỡi nhanh gây sát thương +35%",
        damage: 1.35,
        gif: 'https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3MjJjZWczYzhvbTE2NGxmcXB1ZWMyaDNicGRrZWIwNzlnNXFwdzJsMiZlcD12MV9naWZzX3NlYXJjaCZjdD1n/3o7qDPqEzqnex0qTS0/giphy.gif'           // Lưỡi bắn ra nhanh
    },
    chicken: {
        name: "Fury Peck",
        description: "Mổ liên hoàn gây sát thương +40%",
        damage: 1.4,
        gif: 'https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3dHIycDJ3M3Rhcjl4N295am5vNGRxYW1tNHljeWpibmFiYTRzNTN1OCZlcD12MV9naWZzX3NlYXJjaCZjdD1n/yVKIYvgJcnLksbz5CS/giphy.gif'        // Mổ liên tục nhanh
    },

    // === UNCOMMON ===
    boar: {
        name: "Wild Charge",
        description: "Húc mạnh gây sát thương +55%",
        damage: 1.55,
        gif: 'https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3MG8xczJmZDE5cWJhd3BobWc4d3p0b2tuZWpjNnJwb3Nxd2pkdnkwOSZlcD12MV9naWZzX3NlYXJjaCZjdD1n/cSiyoies9SJC1q0oTH/giphy.gif'           // Lao húc mạnh, bụi bay
    },
    snake: {
        name: "Venom Strike",
        description: "Đòn nọc độc gây sát thương +60%",
        damage: 1.6,
        gif: 'https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3MG8xczJmZDE5cWJhd3BobWc4d3p0b2tuZWpjNnJwb3Nxd2pkdnkwOSZlcD12MV9naWZzX3NlYXJjaCZjdD1n/AMN2Ez4jhyk61vZ8Sj/giphy.gif'          // Cắn độc, nọc xanh
    },
    hawk: {
        name: "Dive Bomb",
        description: "Lao xuống từ trên cao gây sát thương +65%",
        damage: 1.65,
        gif: 'https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3MG8xczJmZDE5cWJhd3BobWc4d3p0b2tuZWpjNnJwb3Nxd2pkdnkwOSZlcD12MV9naWZzX3NlYXJjaCZjdD1n/j52bGrifXj6rIPEn3f/giphy.gif'           // Lao xuống từ trên, tốc độ nhanh
    },
    wolf: {
        name: "Pack Howl",
        description: "Tru gọi đàn tăng sát thương +70%",
        damage: 1.7,
        gif: 'https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3Y3gxZXQwc3plMHYyanAyMzYybXQ3cHk2eDV3M2I4MWh3czR1ZnMzcyZlcD12MV9naWZzX3NlYXJjaCZjdD1n/vYwltjNNaJSXEQ8BMq/giphy.gif'           // Tru lên, sóng âm thanh
    },
    lynx: {
        name: "Shadow Pounce",
        description: "Vồ từ bóng tối gây sát thương +60%",
        damage: 1.6,
        gif: 'https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3Z21tZGR0YnZkYno5eWhyZzY0MG9jNTNpbHh0cDI5YXNoeTc4eTZ4NSZlcD12MV9naWZzX3NlYXJjaCZjdD1n/BFd5bQ1PtXU86pR7k4/giphy.gif'           // Nhảy vồ từ bóng tối
    },

    // === RARE ===
    bear: {
        name: "Bear Slam",
        description: "Đập mạnh gây sát thương +75%",
        damage: 1.75,
        gif: 'https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3Z21tZGR0YnZkYno5eWhyZzY0MG9jNTNpbHh0cDI5YXNoeTc4eTZ4NSZlcD12MV9naWZzX3NlYXJjaCZjdD1n/CLPSFbwMqpsvf5cRe8/giphy.gif'           // Đập hai tay xuống, đất rung
    },
    panther: {
        name: "Night Fury",
        description: "Nổi điên trong đêm gây sát thương +80%",
        damage: 1.8,
        gif: 'https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3Z21tZGR0YnZkYno5eWhyZzY0MG9jNTNpbHh0cDI5YXNoeTc4eTZ4NSZlcD12MV9naWZzX3NlYXJjaCZjdD1n/yRl3I4pFB5zEn4iYzZ/giphy.gif'        // Tấn công liên hoàn, bóng tối
    },
    falcon: {
        name: "Sky Strike",
        description: "Tấn công từ trời cao gây sát thương +85%",
        damage: 1.85,
        gif: 'https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3NDlpa2pzNTVmcmVidG5hZm9sZzJubnNnYmJuNHltMzFwNWkwZ2tseiZlcD12MV9naWZzX3NlYXJjaCZjdD1n/QZCrxXuxbmBCxJvNBD/giphy.gif'         // Lao xuống từ trời, sét
    },
    tiger: {
        name: "Tiger Claw",
        description: "Móng vuốt hổ gây sát thương +90%",
        damage: 1.9,
        gif: 'https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3NDlpa2pzNTVmcmVidG5hZm9sZzJubnNnYmJuNHltMzFwNWkwZ2tseiZlcD12MV9naWZzX3NlYXJjaCZjdD1n/6u2bEt4Wy9NqLv8V1N/giphy.gif'          // Cào 3 vết, ánh sáng cam
    },
    rhino: {
        name: "Horn Charge",
        description: "Húc sừng gây sát thương +80%",
        damage: 1.8,
        gif: 'https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3cnBwY21pOXByemk2Mjlid3l5bDFqcnpoOXNuMHg0b3BxajQyeDhoMyZlcD12MV9naWZzX3NlYXJjaCZjdD1n/4c3fNypXIyxLeYZOp3/giphy.gif'          // Húc sừng, impact mạnh
    },

    // === EPIC ===
    golem: {
        name: "Rock Smash",
        description: "Đập tan đá gây sát thương +100%",
        damage: 2.0,
        gif: 'https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3NWI1dmVwcGdnNDZsNHlrNXdidGhzZzBqeWk3dGo3aDRpcDdqZWI5dCZlcD12MV9naWZzX3NlYXJjaCZjdD1n/5jxNOe9waM5kBDEqeC/giphy.gif'          // Đập tay xuống, đá vỡ
    },
    phoenix: {
        name: "Flame Burst",
        description: "Bùng cháy gây sát thương +110%",
        damage: 2.1,
        gif: 'https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3bDUwb2JkaTFjMWtjbXZuM25zcG1kdm1sZ3BxZXg5aDlubW1tMWVhaiZlcD12MV9naWZzX3NlYXJjaCZjdD1n/qS1vv4IeMydDiM8o7k/giphy.gif'        // Lửa bùng cháy khắp nơi
    },
    shadowcat: {
        name: "Shadow Strike",
        description: "Đánh từ bóng tối gây sát thương +105%",
        damage: 2.05,
        gif: 'https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3bDUwb2JkaTFjMWtjbXZuM25zcG1kdm1sZ3BxZXg5aDlubW1tMWVhaiZlcD12MV9naWZzX3NlYXJjaCZjdD1n/FPghlbhpmS0TXdrQEe/giphy.gif'      // Xuất hiện từ bóng tối, tấn công
    },
    griffin: {
        name: "Sky Dive",
        description: "Lao xuống từ trời gây sát thương +100%",
        damage: 2.0,
        gif: 'https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3bDUwb2JkaTFjMWtjbXZuM25zcG1kdm1sZ3BxZXg5aDlubW1tMWVhaiZlcD12MV9naWZzX3NlYXJjaCZjdD1n/nl37qwc0MXO3lAYDIV/giphy.gif'        // Lao từ trên cao, cánh tung
    },
    leviathan: {
        name: "Tidal Wave",
        description: "Sóng thần gây sát thương +95%",
        damage: 1.95,
        gif: 'https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3NWZnc2l0ZXJsMXhueDk3Ym90eWozN2E0bjU2Y25wdXhqNTdzeDB1eCZlcD12MV9naWZzX3NlYXJjaCZjdD1n/NE17WYZYMmp1kLM5MM/giphy.gif'      // Sóng nước khổng lồ
    },

    // === MYTHIC ===
    voidserpent: {
        name: "Void Devour",
        description: "Nuốt chửng hư vô gây sát thương +120%",
        damage: 2.2,
        gif: 'https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3NWZnc2l0ZXJsMXhueDk3Ym90eWozN2E0bjU2Y25wdXhqNTdzeDB1eCZlcD12MV9naWZzX3NlYXJjaCZjdD1n/BGDKLqbJ48Lau0KAOc/giphy.gif'    // Lỗ đen nuốt chửng
    },
    timefalcon: {
        name: "Time Rift",
        description: "Xé rách thời gian gây sát thương +125%",
        damage: 2.25,
        gif: 'https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3MThsbnZhYW1tbWh6ZWtwcjlmenBmaWRleXF1eHZ2bTN2a2Zvam55dyZlcD12MV9naWZzX3NlYXJjaCZjdD1n/9O1Ka5GnVW1aXAaHpU/giphy.gif'     // Vết nứt thời gian
    },
    astralwolf: {
        name: "Astral Howl",
        description: "Tru lên sao gây sát thương +130%",
        damage: 2.3,
        gif: 'https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3NWZnc2l0ZXJsMXhueDk3Ym90eWozN2E0bjU2Y25wdXhqNTdzeDB1eCZlcD12MV9naWZzX3NlYXJjaCZjdD1n/xULW8hReStSuNaPK7K/giphy.gif'     // Tru, ánh sao rơi xuống
    },
    abysslion: {
        name: "Abyss Roar",
        description: "Gầm vực thẳm gây sát thương +135%",
        damage: 2.35,
        gif: 'PLACEHOLDER_SKILL_ABYSSLION'      // Gầm, bóng tối bùng nổ
    },
    thunderdrake: {
        name: "Thunder Claw",
        description: "Móng vuốt sấm sét gây sát thương +140%",
        damage: 2.4,
        gif: 'https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3cDhweHljeDFmY3U3NzVnbHNkbnpteHp4NWc3YjZqOWVueDZ0ZWwzYiZlcD12MV9naWZzX3NlYXJjaCZjdD1n/vVH1vQaG4XoTzV9yHb/giphy.gif'   // Cào sét, tia điện phóng
    },

    // === LEGENDARY ===
    firephoenix: {
        name: "Inferno Rebirth",
        description: "Tái sinh từ lửa gây sát thương +150%",
        damage: 2.5,
        gif: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExOXRjMXMyd3JiaWNrdXhiNG5heHZkendwNWo3ZDdnYjh5NGJ3engxbSZlcD12MV9naWZzX3NlYXJjaCZjdD1n/OkgOX4EhSkHnbHxosY/giphy.gif'    // Lửa bao phủ, tái sinh
    },
    dragon: {
        name: "Dragon Breath",
        description: "Hơi thở rồng gây sát thương +160%",
        damage: 2.6,
        gif: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExOXRjMXMyd3JiaWNrdXhiNG5heHZkendwNWo3ZDdnYjh5NGJ3engxbSZlcD12MV9naWZzX3NlYXJjaCZjdD1n/6ULDGyRw0uhECEhAaQ/giphy.gif'         // Phun lửa cực mạnh
    },
    demon: {
        name: "Hell Fire",
        description: "Lửa địa ngục gây sát thương +170%",
        damage: 2.7,
        gif: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExOXRjMXMyd3JiaWNrdXhiNG5heHZkendwNWo3ZDdnYjh5NGJ3engxbSZlcD12MV9naWZzX3NlYXJjaCZjdD1n/JRiAeFnqoFLtrHqttI/giphy.gif'          // Lửa đen từ địa ngục
    },
    celestial: {
        name: "Celestial Judgment",
        description: "Phán xét thiên thượng gây sát thương +155%",
        damage: 2.55,
        gif: 'https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3eHFrdWNqOTlxd3N4c2pjaHpjZzZsZHQ5OGhvbmdybzJrdmViYzdxNyZlcD12MV9naWZzX3NlYXJjaCZjdD1n/xfq3k5HAU0UBuLwwKl/giphy.gif'      // Ánh sáng từ trên trời chiếu xuống
    },
    ancientbeast: {
        name: "Primal Rage",
        description: "Cuồng nộ nguyên thủy gây sát thương +165%",
        damage: 2.65,
        gif: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExOXRjMXMyd3JiaWNrdXhiNG5heHZkendwNWo3ZDdnYjh5NGJ3engxbSZlcD12MV9naWZzX3NlYXJjaCZjdD1n/v1ykXkJdLD7tMWvIim/giphy.gif'   // Gầm rú, năng lượng bùng nổ
    }
};

// Default GIF nếu không tìm thấy hoặc PLACEHOLDER chưa được thay
export const DEFAULT_GIF = 'https://media.giphy.com/media/hYLmAm0byRTAVHhJA6/giphy.gif';

// Skill cooldown mặc định
export const SPECIAL_SKILL_COOLDOWN = 4;

// ===== HELPER FUNCTIONS =====

/**
 * Lấy random GIF từ một array
 * Nếu GIF là PLACEHOLDER thì return DEFAULT_GIF
 * @param {string[]} gifArray - Mảng các URL GIF
 * @returns {string} URL GIF ngẫu nhiên
 */
export function getRandomGif(gifArray) {
    if (!gifArray || gifArray.length === 0) return DEFAULT_GIF;

    // Lọc ra các GIF hợp lệ (không phải PLACEHOLDER)
    const validGifs = gifArray.filter(gif =>
        gif &&
        gif.trim() !== '' &&
        !gif.startsWith('PLACEHOLDER_')
    );

    if (validGifs.length === 0) return DEFAULT_GIF;
    return validGifs[Math.floor(Math.random() * validGifs.length)];
}

/**
 * Lấy GIF và thông tin kỹ năng đặc biệt của pet
 * @param {string} petId - ID của pet
 * @returns {Object} { name, description, damage, gif }
 */
export function getPetSkill(petId) {
    const skill = PET_SKILL_GIFS[petId?.toLowerCase()];
    if (skill) {
        // Check if gif is placeholder
        if (skill.gif && skill.gif.startsWith('PLACEHOLDER_')) {
            return { ...skill, gif: getRandomGif(BATTLE_GIFS.skill) };
        }
        return skill;
    }

    // Default skill nếu không tìm thấy
    return {
        name: "Power Strike",
        description: "Đòn đánh mạnh gây sát thương +50%",
        damage: 1.5,
        gif: getRandomGif(BATTLE_GIFS.skill)
    };
}

/**
 * Lấy GIF theo loại action
 * @param {string} actionType - Loại hành động: 'attack', 'crit', 'miss', 'defend', 'skill', 'victory', 'defeat', 'start', 'switch'
 * @param {string} petId - ID pet (chỉ cần cho special skill)
 * @returns {string} URL GIF
 */
export function getActionGif(actionType, petId = null) {
    switch (actionType) {
        case 'attack':
            return getRandomGif(BATTLE_GIFS.normalAttack);
        case 'crit':
            return getRandomGif(BATTLE_GIFS.criticalHit);
        case 'miss':
            return getRandomGif(BATTLE_GIFS.missAttack);
        case 'defend':
            return getRandomGif(BATTLE_GIFS.defend);
        case 'skill':
        case 'special':
            return getPetSkill(petId).gif;
        case 'victory':
            return getRandomGif(BATTLE_GIFS.victory);
        case 'defeat':
            return getRandomGif(BATTLE_GIFS.defeat);
        case 'start':
            return getRandomGif(BATTLE_GIFS.battleStart);
        case 'switch':
            return getRandomGif(BATTLE_GIFS.petSwitch);
        default:
            return DEFAULT_GIF;
    }
}
