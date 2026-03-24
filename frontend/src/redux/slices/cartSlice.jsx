import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import cartService from '../../services/cartService';

// Load cart from localStorage (offline fallback)
const loadCart = () => {
    try {
        const cart = localStorage.getItem('cart');
        return cart ? JSON.parse(cart) : [];
    } catch {
        return [];
    }
};

const saveCart = (items) => {
    localStorage.setItem('cart', JSON.stringify(items));
};

// ── Async Thunks for Backend Cart Sync ──────────────────

// Fetch server cart (when user is logged in)
export const fetchServerCart = createAsyncThunk(
    'cart/fetchServerCart',
    async (_, thunkAPI) => {
        try {
            const data = await cartService.getCart();
            return data.cart;
        } catch (error) {
            return thunkAPI.rejectWithValue('Failed to fetch cart');
        }
    }
);

// Add item to server cart
export const addToServerCart = createAsyncThunk(
    'cart/addToServerCart',
    async ({ productId, quantity }, thunkAPI) => {
        try {
            const data = await cartService.addToCart(productId, quantity);
            return data.cart;
        } catch (error) {
            return thunkAPI.rejectWithValue(error.response?.data?.message || 'Failed to add to cart');
        }
    }
);

// Update server cart item
export const updateServerCartItem = createAsyncThunk(
    'cart/updateServerCartItem',
    async ({ itemId, quantity }, thunkAPI) => {
        try {
            const data = await cartService.updateItem(itemId, quantity);
            return data.cart;
        } catch (error) {
            return thunkAPI.rejectWithValue('Failed to update cart');
        }
    }
);

// Remove from server cart
export const removeFromServerCart = createAsyncThunk(
    'cart/removeFromServerCart',
    async (itemId, thunkAPI) => {
        try {
            const data = await cartService.removeItem(itemId);
            return data.cart;
        } catch (error) {
            return thunkAPI.rejectWithValue('Failed to remove from cart');
        }
    }
);

// Clear server cart
export const clearServerCart = createAsyncThunk(
    'cart/clearServerCart',
    async (_, thunkAPI) => {
        try {
            const data = await cartService.clearCart();
            return data.cart;
        } catch (error) {
            return thunkAPI.rejectWithValue('Failed to clear cart');
        }
    }
);

// ── Helper: normalize server cart items into our format ──
const normalizeServerCart = (serverCart) => {
    if (!serverCart || !serverCart.items) return [];
    return serverCart.items.map((item) => ({
        _id: item.product?._id || item.product,
        _cartItemId: item._id, // Track the subdocument id for updates/removes
        name: item.product?.name || 'Product',
        images: item.product?.images || [],
        price: item.product?.price || item.price,
        discountPrice: item.product?.discountPrice || null,
        stock: item.product?.stock,
        isActive: item.product?.isActive ?? true,
        merchant: item.product?.merchant,
        quantity: item.quantity,
        halalCertified: item.product?.halalCertified,
    }));
};

const initialState = {
    items: loadCart(),
    isCartOpen: false,
    isSyncing: false,
    syncError: null,
};

const cartSlice = createSlice({
    name: 'cart',
    initialState,
    reducers: {
        // Local-only add to cart (works without auth)
        addToCart: (state, action) => {
            const { product, quantity = 1 } = action.payload;
            const existingItem = state.items.find((item) => item._id === product._id);
            if (existingItem) {
                existingItem.quantity += quantity;
            } else {
                state.items.push({ ...product, quantity });
            }
            saveCart(state.items);
        },
        removeFromCart: (state, action) => {
            state.items = state.items.filter((item) => item._id !== action.payload);
            saveCart(state.items);
        },
        updateQuantity: (state, action) => {
            const { id, quantity } = action.payload;
            const item = state.items.find((item) => item._id === id);
            if (item) {
                item.quantity = Math.max(1, quantity);
            }
            saveCart(state.items);
        },
        clearCart: (state) => {
            state.items = [];
            saveCart([]);
        },
        toggleCart: (state) => {
            state.isCartOpen = !state.isCartOpen;
        },
        openCart: (state) => {
            state.isCartOpen = true;
        },
        closeCart: (state) => {
            state.isCartOpen = false;
        },
    },
    extraReducers: (builder) => {
        builder
            // Fetch server cart
            .addCase(fetchServerCart.pending, (state) => {
                state.isSyncing = true;
            })
            .addCase(fetchServerCart.fulfilled, (state, action) => {
                state.isSyncing = false;
                const serverItems = normalizeServerCart(action.payload);
                if (serverItems.length > 0) {
                    state.items = serverItems;
                    saveCart(serverItems);
                }
            })
            .addCase(fetchServerCart.rejected, (state) => {
                state.isSyncing = false;
                // Keep local cart on failure
            })
            // Add to server cart
            .addCase(addToServerCart.fulfilled, (state, action) => {
                const serverItems = normalizeServerCart(action.payload);
                state.items = serverItems;
                saveCart(serverItems);
            })
            // Update server cart item
            .addCase(updateServerCartItem.fulfilled, (state, action) => {
                const serverItems = normalizeServerCart(action.payload);
                state.items = serverItems;
                saveCart(serverItems);
            })
            // Remove from server cart
            .addCase(removeFromServerCart.fulfilled, (state, action) => {
                const serverItems = normalizeServerCart(action.payload);
                state.items = serverItems;
                saveCart(serverItems);
            })
            // Clear server cart
            .addCase(clearServerCart.fulfilled, (state) => {
                state.items = [];
                saveCart([]);
            });
    },
});

// Selectors
export const selectCartItems = (state) => state.cart.items;
export const selectCartCount = (state) =>
    state.cart.items.reduce((total, item) => total + item.quantity, 0);
export const selectCartTotal = (state) =>
    state.cart.items.reduce((total, item) => {
        const price = item.discountPrice || item.price;
        return total + price * item.quantity;
    }, 0);

export const {
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    toggleCart,
    openCart,
    closeCart,
} = cartSlice.actions;

export default cartSlice.reducer;
