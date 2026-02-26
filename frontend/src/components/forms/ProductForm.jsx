import React from 'react';

const ProductForm = ({ product, onSubmit, isEditing = false }) => {
    return (
        <div className="product-form">
            <h2>{isEditing ? 'Edit Product' : 'Add New Product'}</h2>
            <p className="text-body">Product form component — to be connected with full CRUD functionality</p>
        </div>
    );
};

export default ProductForm;
