const quickInput = document.querySelector("#quickInput");
const startInput = document.querySelector("#startInput");
const endInput = document.querySelector("#endInput");
const startPreview = document.querySelector("#startPreview");
const endPreview = document.querySelector("#endPreview");
const resultText = document.querySelector("#resultText");
const statusText = document.querySelector("#statusText");
const copyButton = document.querySelector("#copyButton");
const clearButton = document.querySelector("#clearButton");

const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const previewIdleText = "인식 대기";

let lastResult = "";

function parseDateTime(rawValue) {
  const value = rawValue.trim();

  if (!value) {
    return { ok: false, empty: true };
  }

  const digits = value.replace(/\D/g, "");

  if (digits.length > 0 && digits.length < 10) {
    return { ok: false, incomplete: true, message: "입력 중" };
  }

  if (digits.length !== 10) {
    return { ok: false, message: "DDMMYY HHMM 형식으로 입력하세요." };
  }

  const day = Number(digits.slice(0, 2));
  const month = Number(digits.slice(2, 4));
  const year = 2000 + Number(digits.slice(4, 6));
  const hour = Number(digits.slice(6, 8));
  const minute = Number(digits.slice(8, 10));
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

function formatCompactDateTime(rawValue) {
  const digits = rawValue.replace(/\D/g, "").slice(0, 10);

  if (digits.length <= 6) {
    return digits;
  }

  return `${digits.slice(0, 6)} ${digits.slice(6)}`;
}

function formatInputValue(input) {
  input.value = formatCompactDateTime(input.value);
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
  let parts = null;

  if (slashIndex >= 0) {
    parts = [value.slice(0, slashIndex), value.slice(slashIndex + 1)];
  } else {
    const digits = value.replace(/\D/g, "");

    if (digits.length > 0) {
      parts = [digits.slice(0, 10), digits.slice(10, 20)];
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

quickInput.value = "230526 1743 / 260526 1035";
syncQuickInput();
