export default function SongLoading() {
  return (
    <main
      style={{
        width: "min(720px, calc(100% - 32px))",
        margin: "0 auto",
        padding: "24px 0 56px",
      }}
      aria-label="노래를 불러오는 중"
    >
      <div
        style={{
          width: 120,
          height: 16,
          borderRadius: 999,
          background: "#f3eadf",
          marginBottom: 24,
        }}
      />

      <div
        style={{
          height: 205,
          borderRadius: 22,
          background:
            "linear-gradient(100deg, #fff4df 20%, #fff9f1 40%, #fff4df 60%)",
          marginBottom: 26,
        }}
      />

      <div
        style={{
          width: 130,
          height: 14,
          borderRadius: 999,
          background: "#f3eadf",
          marginBottom: 14,
        }}
      />

      <div
        style={{
          width: "72%",
          height: 34,
          borderRadius: 10,
          background: "#efe5da",
          marginBottom: 14,
        }}
      />

      <div
        style={{
          width: "94%",
          height: 17,
          borderRadius: 999,
          background: "#f5eee7",
          marginBottom: 28,
        }}
      />

      <div
        style={{
          height: 72,
          borderRadius: 22,
          background: "#3b2a20",
          marginBottom: 20,
        }}
      />

      <div
        style={{
          height: 220,
          borderRadius: 22,
          border: "1px solid #f0dfcc",
          background: "#fff",
        }}
      />
    </main>
  );
}
