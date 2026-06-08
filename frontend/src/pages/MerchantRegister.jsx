import React from 'react';
import MerchantRegisterForm from '../components/forms/MerchantRegisterForm';

const MerchantRegister = () => {
    return (
        <div className="merchant-register-page">
            <section className="page-header">
                <div className="container">
                    <h1>Merchant Registration</h1>
                    <p>Complete your merchant onboarding to start selling on the marketplace.</p>
                </div>
            </section>
            <main className="container">
                <MerchantRegisterForm />
            </main>
        </div>
    );
};

export default MerchantRegister;
