import { Navigate } from "react-router-dom";

/** Assets reuse the Files module (logos, contracts, templates). */
export default function AssetsPage() {
  return <Navigate to="/files" replace />;
}
