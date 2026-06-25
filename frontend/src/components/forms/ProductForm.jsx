import React, { useState } from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { FiSave, FiX, FiImage } from 'react-icons/fi';
import { getProductFallbackImage } from '../../lib/utils';

const ProductForm = ({ product, onSubmit, onCancel, isEditing = false }) => {
    const [formData, setFormData] = useState({
        name: product?.name || '',
        description: product?.description || '',
        price: product?.price || '',
        stock: product?.stock || '',
        category: product?.category || 'other',
        imageUrl: product?.images?.[0]?.url || ''
    });

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        
        // Prepare data to exactly match Product.js schema requirements
        const submitData = {
            ...formData,
            images: formData.imageUrl ? [{ url: formData.imageUrl }] : []
        };
        
        onSubmit && onSubmit(submitData);
    };

    return (
        <Card className="w-full max-w-2xl mx-auto shadow-md border-border/50 bg-card text-card-foreground">
            <CardHeader className="space-y-1">
                <CardTitle className="text-2xl font-bold flex items-center gap-2">
                    {isEditing ? 'Edit Product' : 'Add New Product'}
                </CardTitle>
                <CardDescription>
                    Fill out the product information below. The product will be verified before listing.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <form id="productForm" onSubmit={handleSubmit} className="space-y-6">
                    
                    {/* Basic Information */}
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-semibold">Product Name</label>
                                <Input 
                                    name="name"
                                    value={formData.name}
                                    onChange={handleChange}
                                    placeholder="e.g. Premium Beef Tibs" 
                                    required
                                    className="border-primary/20 focus-visible:ring-primary h-11"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-semibold">Category</label>
                                <Input 
                                    name="category"
                                    value={formData.category}
                                    onChange={handleChange}
                                    placeholder="meat, spices, clothing, etc." 
                                    required
                                    className="border-primary/20 focus-visible:ring-primary h-11"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-semibold">Description</label>
                            <textarea 
                                name="description"
                                value={formData.description}
                                onChange={handleChange}
                                className="w-full rounded-md border border-primary/20 bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50 min-h-[100px]"
                                placeholder="Enter detailed product description..."
                                required
                            />
                        </div>

                        {/* Pricing & Inventory */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-semibold">Price (ETB)</label>
                                <Input 
                                    type="number"
                                    name="price"
                                    value={formData.price}
                                    onChange={handleChange}
                                    placeholder="0.00" 
                                    min="0"
                                    required
                                    className="border-primary/20 focus-visible:ring-primary h-11 font-mono"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-semibold">Stock Quantity</label>
                                <Input 
                                    type="number"
                                    name="stock"
                                    value={formData.stock}
                                    onChange={handleChange}
                                    placeholder="100" 
                                    min="0"
                                    required
                                    className="border-primary/20 focus-visible:ring-primary h-11 font-mono"
                                />
                            </div>
                        </div>

                        {/* Images */}
                        <div className="space-y-2">
                            <label className="text-sm font-semibold flex items-center gap-2">
                                <FiImage className="text-primary" /> Image URL
                            </label>
                            <Input 
                                name="imageUrl"
                                value={formData.imageUrl}
                                onChange={handleChange}
                                placeholder="https://..." 
                                required
                                className="border-primary/20 focus-visible:ring-primary h-11"
                            />
                        {formData.imageUrl && (
                            <div className="mt-3 relative w-full h-48 rounded-lg overflow-hidden border border-border">
                                <img 
                                    src={formData.imageUrl} 
                                    alt="Product preview" 
                                    className="w-full h-full object-cover"
                                    onError={(e) => { e.target.src = getProductFallbackImage('Invalid Image', 600, 400); }}
                                />
                            </div>
                        )}
                        </div>
                    </div>
                </form>
            </CardContent>
            <CardFooter className="flex justify-between border-t border-border/50 pt-6">
                <Button 
                    type="button" 
                    variant="outline" 
                    onClick={onCancel}
                    className="border-border text-foreground hover:bg-muted font-medium"
                >
                    <FiX className="mr-2" /> Cancel
                </Button>
                <Button 
                    type="submit" 
                    form="productForm"
                    className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-6 shadow-md shadow-primary/20 transition-all hover:-translate-y-0.5"
                >
                    <FiSave className="mr-2" /> {isEditing ? 'Save Changes' : 'Create Product'}
                </Button>
            </CardFooter>
        </Card>
    );
};

export default ProductForm;
