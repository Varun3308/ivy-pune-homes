import { useSelector } from "react-redux";
export const useApp = () => useSelector((state) => state.app);
