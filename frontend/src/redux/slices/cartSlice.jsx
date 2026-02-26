import { createSlice } from '@reduxjs/toolkit';

// Load cart from localStorage
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

const initialState = {
    items: loadCart(),
    isCartOpen: false,
};

const cartSlice = createSlice({
    name: 'cart',
    initialState,
    reducers: {
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
