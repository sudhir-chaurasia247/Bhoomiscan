const VARIANTS = {
  primary:
    "bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_8px_20px_-8px_var(--primary)]",
  outline: "border border-input bg-card text-foreground hover:bg-secondary",
  soft: "bg-primary-soft text-primary hover:bg-accent",
  ghost: "text-muted-foreground hover:bg-secondary hover:text-foreground",
  success: "bg-success text-success-foreground hover:bg-success/90",
  danger: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
};

const SIZES = {
  sm: "px-3 py-1.5 text-xs",
  md: "px-4 py-2.5 text-sm",
  lg: "px-5 py-3 text-sm",
};

function Button({
  variant = "primary",
  size = "md",
  icon: Icon,
  children,
  className = "",
  ...rest
}) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
      {...rest}
    >
      {Icon ? <Icon className="h-4 w-4" /> : null}
      {children}
    </button>
  );
}

export default Button;
