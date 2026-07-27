
const axios = require("axios");
const fs = require("fs");
const FormData = require("form-data");

const imagePath = "./dummy.png";
// create a 1x1 png file
fs.writeFileSync(imagePath, Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=", "base64"));

async function testUpload() {
  const form = new FormData();
  form.append("folder", "masarak/avatars");
  form.append("file", fs.createReadStream(imagePath));

  try {
    console.log("Uploading...");
    const res = await axios.post("http://localhost:4000/api/upload/image", form, {
      headers: form.getHeaders(),
    });
    console.log("Success:", res.data);
  } catch (e) {
    console.error("Error:", e.response ? e.response.data : e.message);
  } finally {
    if (fs.existsSync(imagePath)) fs.unlinkSync(imagePath);
  }
}
testUpload();


// (Appending test-upload.js is bad, I should overwrite it)

