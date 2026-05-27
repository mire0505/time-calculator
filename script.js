const quickInput = document.querySelector("#quickInput");
const startInput = document.querySelector("#startInput");
const endInput = document.querySelector("#endInput");
const startPreview = document.querySelector("#startPreview");
const endPreview = document.querySelector("#endPreview");
const resultText = document.querySelector("#resultText");
const statusText = document.querySelector("#statusText");
const copyButton = document.querySelector("#copyButton");
const clearButton = document.querySelector("#clearButton");
const currentFormatText = document.querySelector("#currentFormatText");
const quickFormatPill = document.querySelector("#quickFormatPill");
const startFormatPill = document.querySelector("#startFormatPill");
const endFormatPill = document.querySelector("#endFormatPill");
const formatOptions = document.querySelectorAll('input[name="dateFormat"]');

const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const previewIdleText = "인식 대기";
const formatConfigs = {
  DDMMYY: {
    label: "DDMMYY HHMM",
    dateDigits: 6,
    totalDigits: 10,
    startExample: "230526 1743",
    endExample: "260526 1035",
    getParts(digits) {
      return {
        day: Number(digits.slice(0, 2)),
        month: Number(digits.slice(2, 4)),
        year: 2000 + Number(digits.slice(4, 6)),
      };
    },
    formatDate(date) {
      return `${pad(date.getDate())}${pad(date.getMonth() + 1)}${String(date.getFullYear()).slice(-2)}`;
    },
  },
  YYMMDD: {
    label: "YYMMDD HHMM",
    dateDigits: 6,
    totalDigits: 10,
    startExample: "260523 1743",
    endExample: "260526 1035",
    getParts(digits) {
      return {
        year: 2000 + Number(digits.slice(0, 2)),
        month: Number(digits.slice(2, 4)),
        day: Number(digits.slice(4, 6)),
      };
    },
    formatDate(date) {
      return `${String(date.getFullYear()).slice(-2)}${pad(date.getMonth() + 1)}${pad(date.getDate())}`;
    },
  },
  YYYYMMDD: {
    label: "YYYYMMDD HHMM",
    dateDigits: 8,
    totalDigits: 12,
    startExample: "20260523 1743",
    endExample: "20260526 1035",
    getParts(digits) {
      return {
        year: Number(digits.slice(0, 4)),
        month: Number(digits.slice(4, 6)),
        day: Number(digits.slice(6, 8)),
      };
    },
    formatDate(date) {
      return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}`;
    },
  },
};

let lastResult = "";
let currentFormatKey = "DDMMYY";

function parseDateTime(rawValue, config = getCurrentFormat()) {
  const value = rawValue.trim();

  if (!value) {
    return { ok: false, empty: true };
  }

  const digits = value.replace(/\D/g, "");

  if (digits.length > 0 && digits.length < config.totalDigits) {
    return { ok: false, incomplete: true, message: "입력 중" };
  }

  if (digits.length !== config.totalDigits) {
    return { ok: false, message: `${config.label} 형식으로 입력하세요.` };
  }

  const { day, month, year } = config.getParts(digits);
  const timeStart = config.dateDigits;
  const hour = Number(digits.slice(timeStart, timeStart + 2));
  const minute = Number(digits.slice(timeStart + 2, timeStart + 4));
  const date = new Date(year, month - 1, day, hour, minute);

  const isValid =
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day &&
    date.getHours() === hour &&
    date.getMinutes() === minute;

  if (!isValid) {
    return { ok: false, message: "날짜나 시간이 올바르지 않습니다." };
  }

  return {
    ok: true,
    date,
    display: `${pad(day)}${monthNames[month - 1]}${String(year).slice(-2)} ${pad(hour)}${pad(minute)}`,
  };
}

function pad(number) {
  return String(number).padStart(2, "0");
}

function getCurrentFormat() {
  return formatConfigs[currentFormatKey];
}

function formatCompactDateTime(rawValue, config = getCurrentFormat()) {
  const digits = rawValue.replace(/\D/g, "").slice(0, config.totalDigits);

  if (digits.length <= config.dateDigits) {
    return digits;
  }

  return `${digits.slice(0, config.dateDigits)} ${digits.slice(config.dateDigits)}`;
}

function formatInputValue(input) {
  input.value = formatCompactDateTime(input.value);
}

function formatDateForInput(date, config = getCurrentFormat()) {
  return `${config.formatDate(date)} ${pad(date.getHours())}${pad(date.getMinutes())}`;
}

function updateQuickInputFromFields() {
  if (startInput.value && endInput.value) {
    quickInput.value = `${startInput.value} / ${endInput.value}`;
  }
}

function updateFormatUI() {
  const config = getCurrentFormat();

  currentFormatText.textContent = `형식: ${config.label}`;
  quickFormatPill.textContent = "시작 / 종료";
  quickFormatPill.title = config.label;
  startFormatPill.textContent = config.label;
  endFormatPill.textContent = config.label;
  quickInput.placeholder = `${config.startExample} / ${config.endExample}`;
  startInput.placeholder = `예: ${config.startExample}`;
  endInput.placeholder = `예: ${config.endExample}`;
  startInput.maxLength = config.dateDigits + 5;
  endInput.maxLength = config.dateDigits + 5;
}

function changeDateFormat(nextFormatKey) {
  const previousFormat = getCurrentFormat();
  const previousStart = parseDateTime(startInput.value, previousFormat);
  const previousEnd = parseDateTime(endInput.value, previousFormat);

  currentFormatKey = nextFormatKey;
  updateFormatUI();

  if (previousStart.ok) {
    startInput.value = formatDateForInput(previousStart.date);
  } else {
    formatInputValue(startInput);
  }

  if (previousEnd.ok) {
    endInput.value = formatDateForInput(previousEnd.date);
  } else {
    formatInputValue(endInput);
  }

  updateQuickInputFromFields();
  calculate();
}

function formatDuration(totalMinutes) {
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;

  return {
    excel: `${pad(days)}days ${pad(hours)}hours ${pad(minutes)}mins`,
    korean: `${days}일 ${hours}시간 ${minutes}분`,
  };
}

function setStatus(message, isOk = false) {
  statusText.textContent = message;
  statusText.classList.toggle("is-ok", isOk);
}

function clearResult() {
  lastResult = "";
  resultText.textContent = "--";
  copyButton.disabled = true;
}

function getPreviewText(parsed) {
  if (parsed.empty) {
    return previewIdleText;
  }

  if (parsed.ok) {
    return `인식: ${parsed.display}`;
  }

  if (parsed.incomplete) {
    return "입력 중";
  }

  return "확인 필요";
}

function calculate() {
  const start = parseDateTime(startInput.value);
  const end = parseDateTime(endInput.value);
  const hasStart = !start.empty;
  const hasEnd = !end.empty;

  startPreview.textContent = getPreviewText(start);
  endPreview.textContent = getPreviewText(end);
  clearResult();

  if (!hasStart && !hasEnd) {
    setStatus("");
    return;
  }

  if (start.incomplete || end.incomplete) {
    setStatus("");
    return;
  }

  if (hasStart && !start.ok) {
    setStatus(`시작: ${start.message}`);
    return;
  }

  if (hasEnd && !end.ok) {
    setStatus(`종료: ${end.message}`);
    return;
  }

  if (!hasStart || !hasEnd) {
    setStatus("");
    return;
  }

  const totalMinutes = Math.floor((end.date.getTime() - start.date.getTime()) / 60000);

  if (totalMinutes < 0) {
    setStatus("종료 시간이 시작 시간보다 빠릅니다.");
    return;
  }

  const duration = formatDuration(totalMinutes);
  lastResult = duration.korean;
  resultText.textContent = duration.korean;
  copyButton.disabled = false;
  setStatus(duration.excel, true);
}

function syncQuickInput() {
  const value = quickInput.value.trim();
  const slashIndex = value.indexOf("/");
  const config = getCurrentFormat();
  let parts = null;

  if (slashIndex >= 0) {
    parts = [value.slice(0, slashIndex), value.slice(slashIndex + 1)];
  } else {
    const digits = value.replace(/\D/g, "");

    if (digits.length > 0) {
      parts = [digits.slice(0, config.totalDigits), digits.slice(config.totalDigits, config.totalDigits * 2)];
    }
  }

  if (!parts) {
    startInput.value = "";
    endInput.value = "";
    calculate();
    return;
  }

  startInput.value = formatCompactDateTime(parts[0]);
  endInput.value = formatCompactDateTime(parts[1]);
  calculate();
}

quickInput.addEventListener("input", syncQuickInput);

formatOptions.forEach((option) => {
  option.addEventListener("change", () => {
    if (option.checked) {
      changeDateFormat(option.value);
    }
  });
});

startInput.addEventListener("input", () => {
  formatInputValue(startInput);
  calculate();
});

endInput.addEventListener("input", () => {
  formatInputValue(endInput);
  calculate();
});

clearButton.addEventListener("click", () => {
  quickInput.value = "";
  startInput.value = "";
  endInput.value = "";
  startPreview.textContent = previewIdleText;
  endPreview.textContent = previewIdleText;
  clearResult();
  setStatus("");
  quickInput.focus();
});

copyButton.addEventListener("click", async () => {
  if (!lastResult) {
    return;
  }

  try {
    await navigator.clipboard.writeText(lastResult);
    setStatus("복사되었습니다.", true);
  } catch {
    setStatus("복사할 수 없습니다.");
  }
});

updateFormatUI();
quickInput.value = "230526 1743 / 260526 1035";
syncQuickInput();
