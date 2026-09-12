/**
 * Dev helper: renders a sample land-record image used by the smoke test.
 * Usage: node scripts/make-sample.js /tmp/sample.png
 */
const fs = require("fs");
const { execFileSync } = require("child_process");

const LINES = [
  "GOVERNMENT OF MAHARASHTRA",
  "VILLAGE FORM VII-XII (7/12 EXTRACT)",
  "Owner Name: Ramesh Shivaji Kulkarni",
  "Father Name: Shivaji Kulkarni",
  "Khasra Number: 145/2A",
  "Survey Number: 88/3",
  "Village: Wagholi",
  "Taluka: Haveli",
  "District: Pune",
  "State: Maharashtra",
  "Land Area: 2.35 hectares",
  "Record Year: 2019",
];

const output = process.argv[2] || "/tmp/sample-record.png";
const text = LINES.join("\n");
const textFile = `${output}.txt`;
fs.writeFileSync(textFile, text);

execFileSync("convert", [
  "-size",
  "1240x900",
  "xc:white",
  "-font",
  "DejaVu-Sans",
  "-pointsize",
  "34",
  "-fill",
  "black",
  "-annotate",
  "+60+90",
  text,
  output,
]);

console.log(output);
