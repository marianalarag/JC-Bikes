import { Link } from "react-router-dom";
import logo from "../images/jcbikes transparente.png";

export default function BrandLogo({ size = "md", textClassName = "" }) {
  const imageSize = size === "lg" ? "h-14" : "h-10";
  const textSize = size === "lg" ? "text-3xl" : "text-xl";

  return (
    <Link to="/" className="flex items-center">
      <img src={logo} alt="JC Bikes Logo" className={`${imageSize} w-auto`} />
      <span
        className={`ml-3 font-bold ${textSize} text-gray-800 dark:text-white ${textClassName}`}
      >
        JC BIKES
      </span>
    </Link>
  );
}
