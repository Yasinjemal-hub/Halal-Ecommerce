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

    // Update / resubmit own application (rejected → pending; pending /
    // under_review → in-place edit; approved / suspended → 403)
    updateRegistration: async (applicationData) => {
        const response = await api.put('/mejilis/registration', applicationData);
        return response.data;
    },

    // Download own issued certificate as a server-generated PDF (blob)
    downloadCertificatePdf: async () => {
        const response = await api.get('/mejilis/certificate/pdf', { responseType: 'blob' });
        return response.data;
    },

    // Public certificate verification by certificate number
    verifyCertificate: async (certificateNumber) => {
        const response = await api.get(`/mejilis/certifications/verify/${certificateNumber}`);
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
        const url = `/mejilis/merchants?${queryString}`;
        const response = await api.get(url);
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

    // Single certification application with full review detail
    // (documents, inspections, status history) for authorized reviewers.
    getCertificationById: async (id) => {
        const response = await api.get(`/mejilis/certifications/${id}`);
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
