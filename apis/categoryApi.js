const API_BASE_URL = 'https://backend-production-311e.up.railway.app/api';

const categoryApi = {
    getAllCategories: async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/categories`);
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Lỗi khi lấy danh mục:', error);
            throw error;
        }
    }
};

export default categoryApi; 