import app from "@src/app";

const PORT: number = Number(process.env.PORT) || 3000;
const URL: string = process.env.URL || "0.0.0.0";
app.listen(PORT, URL, () => {
    console.log(`Server running on ${URL}:${PORT}`);
});

