// Customer-facing labels for WRStatus values shown in the client portal.
// Admin screens keep the raw DB values; only client-portal UI runs status
// through this mapper.
export function formatClientStatus(status: string): string {
    switch (status) {
        case "ACTIVE":    return "Received";
        case "INACTIVE":  return "Processed";
        case "SHIPPED":   return "Shipped";
        case "CANCELLED": return "Cancelled";
        default:          return status;
    }
}
