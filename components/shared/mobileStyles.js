export function modalStyle(isMobile, desktopWidth = 520) {
  if (isMobile) {
    return {
      width: "100%",
      height: "100%",
      maxHeight: "100%",
      borderRadius: 0,
      margin: 0,
    };
  }
  return {
    width: desktopWidth,
    maxHeight: "85vh",
    borderRadius: 16,
  };
}

export function modalBackdropStyle(isMobile) {
  return {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.6)",
    backdropFilter: isMobile ? "none" : "blur(4px)",
    zIndex: 10000,
    display: "flex",
    alignItems: isMobile ? "stretch" : "center",
    justifyContent: isMobile ? "stretch" : "center",
  };
}
