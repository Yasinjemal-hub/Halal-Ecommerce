import { createSlice } from '@reduxjs/toolkit';
import authService from '../../services/authService';

const getUserId = () => {
    const user = authService.getCurrentUser();
    return user?._id || 'guest';
};

const getWishlistKey = () => `wishlist_${getUserId()}`;

const loadWishlist = () => {
    try {
        const wishlist = localStorage.getItem(getWishlistKey());
        return wishlist ? JSON.parse(wishlist) : [];
    } catch {
        return [];
    }
};

const saveWishlist = (items) => {
    localStorage.setItem(getWishlistKey(), JSON.stringify(items));
};

const clearWishlistStorage = () => {
    // Clear current user's wishlist
    const key = getWishlistKey();
    localStorage.removeItem(key);
    // Also clear old generic key for backward compatibility
    localStorage.removeItem('wishlist');
};

const initialState = {
    items: loadWishlist(),
};

const wishlistSlice = createSlice({
    name: 'wishlist',
    initialState,
    reducers: {
        addToWishlist: (state, action) => {
            const product = action.payload;
            const exists = state.items.some((item) => item._id === product._id);
            if (!exists) {
                state.items.push(product);
                saveWishlist(state.items);
            }
        },
        removeFromWishlist: (state, action) => {
            state.items = state.items.filter((item) => item._id !== action.payload);
            saveWishlist(state.items);
        },
        toggleWishlistItem: (state, action) => {
            const product = action.payload;
            const index = state.items.findIndex((item) => item._id === product._id);
            if (index >= 0) {
                state.items.splice(index, 1);
            } else {
                state.items.push(product);
            }
            saveWishlist(state.items);
        },
        clearWishlist: (state) => {
            state.items = [];
            clearWishlistStorage();
        },
    },
});

export const selectWishlistItems = (state) => state.wishlist.items;
export const selectWishlistCount = (state) => state.wishlist.items.length;
export const {
    addToWishlist,
    removeFromWishlist,
    toggleWishlistItem,
    clearWishlist,
} = wishlistSlice.actions;

export default wishlistSlice.reducer;
