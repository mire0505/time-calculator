const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const { test } = require("node:test");
const vm = require("node:vm");

const source = readFileSync(join(__dirname, "..", "script.js"), "utf8");

function app() {
  const elements = new Map();
  function element(id) {
    if (!elements.has(id)) {
      elements.set(id, {
        value: "", textContent: "", disabled: false, checked: false,
        selectionStart: 0, selectionEnd: 0, events: {},
        classList: { toggle() {} },
        addEventListener(type, handler) { this.events[type] = handler; },
        setSelectionRange(start, end) { this.selectionStart = start; this.selectionEnd = end; },
        focus() { this.events.focus?.(); },
      });
    }
    return elements.get(id);
  }
  const options = ["DDMMYY", "YYMMDD", "YYYYMMDD"].map((value) => {
    const option = element(value);
    option.value = value;
    option.checked = value === "DDMMYY";
    return option;
  });
  const context = vm.createContext({
    document: { querySelector: element, querySelectorAll: () => options },
    navigator: { clipboard: { writeText: async () => {} } },
  });
  vm.runInContext(source, context);
  return {
    get: (id) => element(`#${id}`),
    input(id, value) {
      const input = element(`#${id}`);
      input.value = value;
      input.setSelectionRange(value.length, value.length);
      input.events.input();
    },
    click(id) {
      const button = element(`#${id}`);
      if (!button.disabled) button.events.click();
    },
    format(value) {
      options.forEach((option) => { option.checked = option.value === value; });
      element(value).events.change();
    },
  };
}

test("opens empty with date controls and copy disabled", () => {
  const ui = app();
  assert.equal(ui.get("startInput").value, "");
  assert.equal(ui.get("endInput").value, "");
  assert.equal(ui.get("resultText").textContent, "--");
  for (const id of ["endMinusDay", "endPlusDay", "copyButton"]) assert.equal(ui.get(id).disabled, true);
});

for (const [format, date, nextDate] of [
  ["DDMMYY", "230526", "240526"],
  ["YYMMDD", "260523", "260524"],
  ["YYYYMMDD", "20260523", "20260524"],
]) {
  test(`${format}: copies date before time is entered, then calculates`, () => {
    const ui = app();
    ui.format(format);
    ui.input("startInput", date.slice(0, -1));
    assert.equal(ui.get("endInput").value, "");
    ui.input("startInput", date);
    assert.equal(ui.get("endInput").value, `${date} `);
    assert.equal(ui.get("endPreview").textContent, "인식: 23May26 ----");
    assert.equal(ui.get("endPlusDay").disabled, false);
    ui.input("startInput", `${date}1743`);
    ui.input("endInput", `${date}1830`);
    assert.equal(ui.get("endPreview").textContent, "인식: 23May26 1830");
    assert.equal(ui.get("resultText").textContent, "0일 0시간 47분");
    ui.click("endPlusDay");
    assert.equal(ui.get("endInput").value, `${nextDate} 1830`);
    assert.equal(ui.get("resultText").textContent, "1일 0시간 47분");
    ui.click("endMinusDay");
    assert.equal(ui.get("endInput").value, `${date} 1830`);
    assert.equal(ui.get("quickInput").value, `${date} 1743 / ${date} 1830`);
  });

  test(`${format}: day buttons work without an end time`, () => {
    const ui = app();
    ui.format(format);
    ui.input("startInput", date);
    ui.click("endPlusDay");
    assert.equal(ui.get("endInput").value, `${nextDate} `);
    assert.equal(ui.get("resultText").textContent, "--");
    ui.click("endMinusDay");
    assert.equal(ui.get("endInput").value, `${date} `);
  });
}

test("time-only edits keep the automatic date linked until the day is adjusted", () => {
  const ui = app();
  ui.input("startInput", "2305261743");
  ui.input("endInput", "2305261830");
  ui.input("startInput", "2405261743");
  assert.equal(ui.get("endInput").value, "240526 1830");
  ui.click("endPlusDay");
  ui.input("startInput", "2605261743");
  assert.equal(ui.get("endInput").value, "250526 1830");
  assert.equal(ui.get("resultText").textContent, "--");
  assert.equal(ui.get("statusText").textContent, "종료 시간이 시작 시간보다 빠릅니다.");
});

test("manual end dates and pasted pairs are preserved", () => {
  const ui = app();
  ui.input("startInput", "2305261743");
  ui.input("endInput", "2605261035");
  ui.input("startInput", "2405261743");
  assert.equal(ui.get("endInput").value, "260526 1035");
  ui.input("quickInput", "23052617432605261035");
  assert.equal(ui.get("resultText").textContent, "2일 16시간 52분");
  ui.input("startInput", "2405261743");
  assert.equal(ui.get("endInput").value, "260526 1035");
});

test("pasting only a start date fills the end date", () => {
  const ui = app();
  ui.input("quickInput", "230526 1743 /");
  assert.equal(ui.get("endInput").value, "230526 ");
});

test("format changes preserve automatic and adjusted date-only end values", () => {
  const ui = app();
  ui.input("startInput", "2305261743");
  ui.format("YYYYMMDD");
  assert.equal(ui.get("endInput").value, "20260523 ");
  ui.click("endPlusDay");
  ui.format("YYMMDD");
  assert.equal(ui.get("endInput").value, "260524 ");
  ui.input("startInput", "2605251743");
  assert.equal(ui.get("endInput").value, "260524 ");
});

for (const [before, after] of [
  ["20260131", "20260201"],
  ["20260228", "20260301"],
  ["20240228", "20240229"],
  ["20240229", "20240301"],
  ["20261231", "20270101"],
]) {
  test(`calendar boundary ${before} -> ${after}, preserving time`, () => {
    const ui = app();
    ui.format("YYYYMMDD");
    ui.input("endInput", `${before} 1035`);
    ui.click("endPlusDay");
    assert.equal(ui.get("endInput").value, `${after} 1035`);
    ui.click("endMinusDay");
    assert.equal(ui.get("endInput").value, `${before} 1035`);
  });
}

test("invalid dates disable adjustments and do not auto-fill", () => {
  const ui = app();
  ui.input("startInput", "310226");
  assert.equal(ui.get("endInput").value, "");
  ui.input("endInput", "3102261035");
  assert.equal(ui.get("endPlusDay").disabled, true);
  assert.equal(ui.get("endMinusDay").disabled, true);
  assert.equal(ui.get("resultText").textContent, "--");
});

test("clearing resets the date link and disables buttons", () => {
  const ui = app();
  ui.input("startInput", "230526");
  ui.click("endPlusDay");
  ui.click("clearButton");
  assert.equal(ui.get("endPlusDay").disabled, true);
  assert.equal(ui.get("quickInput").value, "");
  ui.input("startInput", "180926");
  assert.equal(ui.get("endInput").value, "180926 ");
});

test("date-only end input places the cursor after the date on focus and click", () => {
  const ui = app();
  ui.input("startInput", "230526");
  ui.get("endInput").focus();
  assert.equal(ui.get("endInput").selectionStart, 7);
  ui.get("endInput").setSelectionRange(0, 0);
  ui.click("endInput");
  assert.equal(ui.get("endInput").selectionStart, 7);
});

test("day adjustments preserve partially typed time", () => {
  const ui = app();
  ui.input("startInput", "230526");
  ui.input("endInput", "230526 12");
  ui.click("endPlusDay");
  assert.equal(ui.get("endInput").value, "240526 12");
  assert.equal(ui.get("resultText").textContent, "--");
});

test("two-digit year boundaries never wrap to a different century", () => {
  const ui = app();
  ui.input("endInput", "311299 1035");
  assert.equal(ui.get("endPlusDay").disabled, true);
  ui.input("endInput", "010100 1035");
  assert.equal(ui.get("endMinusDay").disabled, true);
  ui.format("YYYYMMDD");
  ui.click("endMinusDay");
  assert.equal(ui.get("endInput").value, "19991231 1035");
  ui.format("DDMMYY");
  assert.equal(ui.get("endInput").value, "19991231 1035");
  assert.equal(ui.get("currentFormatText").textContent, "형식: YYYYMMDD HHMM");
});

test("four-digit year boundaries remain representable", () => {
  const ui = app();
  ui.format("YYYYMMDD");
  ui.input("endInput", "00010101 1035");
  assert.equal(ui.get("endMinusDay").disabled, true);
  ui.click("endPlusDay");
  assert.equal(ui.get("endInput").value, "00010102 1035");
  assert.equal(ui.get("endPreview").textContent, "인식: 02Jan01 1035");
  ui.input("endInput", "99991231 1035");
  assert.equal(ui.get("endPlusDay").disabled, true);
});
