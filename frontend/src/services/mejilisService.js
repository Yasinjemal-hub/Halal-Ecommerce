import api from './api';

const mejilisService = {
    // ── Public ──────────────────────────────────────────────
    getMejilis: async () => {
        const response = await api.get('/mejilis');
        return response.data;
    },

    // ── Merchant Registration ───────────────────────────────
    registerMerchant: async (merchantData) => {
        const response = await api.post('/mejilis/register-merchant', merchantData);
        return response.data;
    },

    getRegistrationStatus: async () => {
        const response = await api.get('/mejilis/registration-status');
        return response.data;
    },

    // ── Complaints (Consumer) ───────────────────────────────
    fileComplaint: async (complaintData) => {
        const response = await api.post('/mejilis/complaints', complaintData);
        return response.data;
    },

    // ── Admin / Mejilis Dashboard ───────────────────────────
    getDashboard: async () => {
        const response = await api.get('/mejilis/dashboard');
        return response.data;
    },

    // ── Merchant Management (Admin) ─────────────────────────
    getMerchants: async (params = {}) => {
        const queryString = new URLSearchParams(params).toString();
        const response = await api.get(`/mejilis/merchants?${queryString}`);
        return response.data;
    },

    verifyMerchant: async (id, data) => {
        const response = await api.put(`/mejilis/merchants/${id}/verify`, data);
        return response.data;
    },

    // ── Certifications (Admin) ──────────────────────────────
    getCertifications: async (params = {}) => {
        const queryString = new URLSearchParams(params).toString();
        const response = await api.get(`/mejilis/certifications?${queryString}`);
        return response.data;
    },

    reviewCertification: async (id, data) => {
        const response = await api.put(`/mejilis/certifications/${id}/review`, data);
        return response.data;
    },

    // ── Complaints (Admin) ──────────────────────────────────
    getComplaints: async (params = {}) => {
        const queryString = new URLSearchParams(params).toString();
        const response = await api.get(`/mejilis/complaints?${queryString}`);
        return response.data;
    },

    updateComplaint: async (complaintId, data) => {
        const response = await api.put(`/mejilis/complaints/${complaintId}`, data);
        return response.data;
    },

    // ── Sessions (Admin) ────────────────────────────────────
    getSessions: async () => {
        const response = await api.get('/mejilis/sessions');
        return response.data;
    },

    createSession: async (sessionData) => {
        const response = await api.post('/mejilis/sessions', sessionData);
        return response.data;
    },
};

export default mejilisService;
