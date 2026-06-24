import { useCallback, useMemo, useReducer } from "react";
import api from "../utils/api";
import { CartContext } from "./cartContext";

const initialState = {
  items: [],
};

const getProductId = (product) => String(product.id);

const cartReducer = (state, action) => {
  switch (action.type) {
    case "ADD_ITEM": {
      const product = action.product;
      const quantity = action.quantity;
      const productId = getProductId(product);
      const existingItem = state.items.find(
        (item) => getProductId(item.product) === productId,
      );

      if (existingItem) {
        return {
          ...state,
          items: state.items.map((item) =>
            getProductId(item.product) === productId
              ? { ...item, quantity: item.quantity + quantity }
              : item,
          ),
        };
      }

      return {
        ...state,
        items: [...state.items, { product, quantity }],
      };
    }
    case "SET_QUANTITY": {
      if (action.quantity <= 0) {
        return {
          ...state,
          items: state.items.filter(
            (item) => getProductId(item.product) !== String(action.productId),
          ),
        };
      }

      return {
        ...state,
        items: state.items.map((item) =>
          getProductId(item.product) === String(action.productId)
            ? { ...item, quantity: action.quantity }
            : item,
        ),
      };
    }
    case "REMOVE_ITEM":
      return {
        ...state,
        items: state.items.filter(
          (item) => getProductId(item.product) !== String(action.productId),
        ),
      };
    case "CLEAR_CART":
      return initialState;
    default:
      return state;
  }
};

export function CartProvider({ children }) {
  const [state, dispatch] = useReducer(cartReducer, initialState);

  const verifyStock = useCallback(async (productId, quantity) => {
    const response = await api.get(`/products/${productId}/stock`, {
      params: { quantity },
    });
    return response.data;
  }, []);

  const addToCart = useCallback(
    async (product, quantity = 1) => {
      const cleanQuantity = Math.max(1, Number(quantity) || 1);
      const existingItem = state.items.find(
        (item) => getProductId(item.product) === getProductId(product),
      );
      const desiredQuantity = (existingItem?.quantity || 0) + cleanQuantity;
      const stockResult = await verifyStock(product.id, desiredQuantity);

      if (!stockResult.canFulfill) {
        return {
          ok: false,
          message: `Solo hay ${stockResult.stock} unidades disponibles.`,
        };
      }

      dispatch({ type: "ADD_ITEM", product, quantity: cleanQuantity });
      return { ok: true, message: "Producto agregado al carrito." };
    },
    [state.items, verifyStock],
  );

  const updateQuantity = useCallback(
    async (productId, quantity) => {
      const cleanQuantity = Number(quantity) || 0;

      if (cleanQuantity <= 0) {
        dispatch({ type: "REMOVE_ITEM", productId });
        return { ok: true };
      }

      const stockResult = await verifyStock(productId, cleanQuantity);

      if (!stockResult.canFulfill) {
        return {
          ok: false,
          message: `Solo hay ${stockResult.stock} unidades disponibles.`,
        };
      }

      dispatch({ type: "SET_QUANTITY", productId, quantity: cleanQuantity });
      return { ok: true };
    },
    [verifyStock],
  );

  const removeFromCart = useCallback((productId) => {
    dispatch({ type: "REMOVE_ITEM", productId });
  }, []);

  const clearCart = useCallback(() => {
    dispatch({ type: "CLEAR_CART" });
  }, []);

  const value = useMemo(() => {
    const totalItems = state.items.reduce((sum, item) => sum + item.quantity, 0);
    const subtotal = state.items.reduce(
      (sum, item) => sum + Number(item.product.price || 0) * item.quantity,
      0,
    );

    return {
      items: state.items,
      totalItems,
      subtotal,
      addToCart,
      updateQuantity,
      removeFromCart,
      clearCart,
    };
  }, [addToCart, clearCart, removeFromCart, state.items, updateQuantity]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}
