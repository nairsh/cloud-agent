export function RunningGrid() {
  return (
    <span
      aria-hidden="true"
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(3, 3px)",
        gap: 2,
        alignItems: "center",
        justifyContent: "center",
        width: 16,
      }}
    >
      {Array.from({ length: 9 }, (_, index) => (
        <span
          key={index}
          style={{
            width: 3,
            height: 3,
            borderRadius: "50%",
            background: "var(--accent)",
            animation: "pulse-grid 1.2s infinite ease-in-out",
            animationDelay: `${(index % 5) * 0.1}s`,
          }}
        />
      ))}
    </span>
  );
}
