import { $ } from "./view.js";
// Form state is private to each owner. Review persistence retains the established storage key.
export function createDrafts({
  selector,
  view,
  userId,
  persistent = false,
  photoDirty = () => false,
  restored = () => {},
}) {
  const memory = new Map();
  let active = "",
    baseline = "";
  const fields = (form) =>
    [...form.elements]
      .filter(
        (input) =>
          input.name && !["file", "submit", "button"].includes(input.type),
      )
      .map((input) => ({
        name: input.name,
        type: input.type,
        value: input.value,
        checked: input.checked,
      }));
  const saved = (key = active) => {
    try {
      return persistent
        ? JSON.parse(
            sessionStorage.getItem("rmc-review-draft-v1:" + key) || "null",
          )
        : null;
    } catch {
      return null;
    }
  };
  function update() {
    const status = $(".draft-status");
    if (!status) return;
    const dirty = memory.has(active) || photoDirty();
    status.hidden = !dirty;
    status.textContent =
      view.language === "zh"
        ? "有未保存的修改 · 此标签页内保留，刷新前请保存。"
        : "Unsaved changes · Kept in this tab. Save before reloading.";
    const form = $(selector);
    if (
      persistent &&
      form &&
      JSON.stringify(saved()) === JSON.stringify(fields(form))
    ) {
      status.hidden = false;
      status.textContent =
        view.language === "zh"
          ? "草稿已保存 · 此标签页刷新后可恢复。"
          : "Draft saved · Reloading this tab restores it.";
    }
  }
  function capture() {
    const form = $(selector);
    if (!form || !active) return;
    const current = fields(form);
    if (JSON.stringify(current) === baseline) memory.delete(active);
    else memory.set(active, current);
    update();
  }
  function restore() {
    const form = $(selector);
    active = "";
    baseline = "";
    if (!form || !userId()) return;
    const current = view.route();
    active = JSON.stringify([
      userId(),
      current.path,
      current.params.get("edit") || "",
      current.params.get("course") || "",
      current.params.get("provider") || "",
    ]);
    baseline = JSON.stringify(fields(form));
    const stored = memory.get(active) || saved();
    if (stored)
      stored.forEach((field) =>
        [...form.elements]
          .filter(
            (input) =>
              input.name === field.name &&
              input.type === field.type &&
              (!["radio", "checkbox"].includes(field.type) ||
                input.value === field.value),
          )
          .forEach((input) => {
            if (["radio", "checkbox"].includes(field.type))
              input.checked = field.checked;
            else input.value = field.value;
          }),
      );
    restored(form);
    const status = document.createElement("p");
    status.className = "draft-status hint";
    status.setAttribute("role", "status");
    form.querySelector(".form-actions").before(status);
    update();
  }
  return {
    capture,
    restore,
    update,
    save() {
      const form = $(selector);
      if (!form || !active || !persistent) return;
      capture();
      try {
        sessionStorage.setItem(
          "rmc-review-draft-v1:" + active,
          JSON.stringify(fields(form)),
        );
        update();
      } catch {
        const status = $(".draft-status");
        status.hidden = false;
        status.textContent =
          view.language === "zh"
            ? "草稿未保存，输入仍保留，请重试。"
            : "Draft not saved. Your input is retained; try again.";
      }
    },
    clear() {
      if (persistent)
        try {
          sessionStorage.removeItem("rmc-review-draft-v1:" + active);
        } catch {}
      memory.delete(active);
      active = "";
      baseline = "";
    },
    reset() {
      memory.clear();
      active = "";
      baseline = "";
    },
    get dirty() {
      return (
        photoDirty() ||
        [...memory].some(
          ([key, value]) =>
            JSON.stringify(value) !== JSON.stringify(saved(key)),
        )
      );
    },
  };
}
