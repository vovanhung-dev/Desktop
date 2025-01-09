const API_BASE_URL = 'https://backend-production-311e.up.railway.app/api';

const webAccessApi = {
    getAllAccess: async (userId) => {
        try {
            const response = await fetch(`${API_BASE_URL}/access/user/${userId}`);
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Error fetching web access:', error);
            throw error;
        }
    },

    createAccess: async (accessData) => {
        try {
            const response = await fetch(`${API_BASE_URL}/access`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(accessData),
            });
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Error creating web access:', error);
            throw error;
        }
    },

    deleteAccess: async (id) => {
        try {
            const response = await fetch(`${API_BASE_URL}/access/${id}`, {
                method: 'DELETE',
            });
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Error deleting web access:', error);
            throw error;
        }
    },

    updateAccessStatus: async (id, status) => {
        try {
            const response = await fetch(`${API_BASE_URL}/access/${id}/status`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ status }),
            });
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Error updating web access status:', error);
            throw error;
        }
    }
};

export default webAccessApi; 