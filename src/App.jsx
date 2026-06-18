import { useEffect, useMemo, useState } from "react";
import "./App.css";

const DEFAULT_BATCH_SIZE = 16;
const STORAGE_KEY = "scene-prompt-batch-builder-state-v1";
const SAVED_PROMPTS_KEY = "scene-prompt-builder-saved-prompts-v1";

function readSavedPrompts() {
  try {
    const raw = localStorage.getItem(SAVED_PROMPTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/** Read and parse saved state once — used by lazy useState initialisers. */
function readSaved() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

const COLORS = [
  "#E3F2FD",
  "#E8F5E9",
  "#FFF3E0",
  "#FCE4EC",
  "#EDE7F6",
  "#E0F7FA",
  "#FFF8E1",
  "#F3E5F5",
  "#F1F8E9",
  "#ECEFF1",
  "#FBE9E7",
  "#E8F5E9",
];

const DARK_COLORS = [
  "#0d2137",
  "#0d2918",
  "#2d1f05",
  "#2d0f1a",
  "#1a0f2d",
  "#051f24",
  "#2d2200",
  "#200528",
  "#162410",
  "#111520",
  "#2d100a",
  "#0d2918",
];

export default function App() {
  const [fixedPrompt, setFixedPrompt] = useState(() => {
    const s = readSaved();
    return typeof s.fixedPrompt === "string" ? s.fixedPrompt : "";
  });

  const [batchSize, setBatchSize] = useState(() => {
    const s = readSaved();
    const parsed = Number(s.batchSize);

    if (!Number.isFinite(parsed)) return DEFAULT_BATCH_SIZE;

    return Math.max(1, Math.min(128, Math.floor(parsed)));
  });

  const [rows, setRows] = useState(() => {
    const s = readSaved();
    return Array.isArray(s.rows) ? s.rows : [];
  });

  const [batches, setBatches] = useState(() => {
    const s = readSaved();
    return Array.isArray(s.batches) ? s.batches : [];
  });

  const [finalInputs, setFinalInputs] = useState(() => {
    const s = readSaved();
    return Array.isArray(s.finalInputs) ? s.finalInputs : [];
  });

  const [finalInputDone, setFinalInputDone] = useState(() => {
    const s = readSaved();
    return s.finalInputDone && typeof s.finalInputDone === "object"
      ? s.finalInputDone
      : {};
  });

  const [selectedLayers, setSelectedLayers] = useState(() => {
    const s = readSaved();
    return Array.isArray(s.selectedLayers) ? s.selectedLayers : [];
  });

  const [searchText, setSearchText] = useState(() => {
    const s = readSaved();
    return typeof s.searchText === "string" ? s.searchText : "";
  });

  const [showBatches, setShowBatches] = useState(() => {
    const s = readSaved();
    return Boolean(s.showBatches);
  });

  const [copiedItems, setCopiedItems] = useState({});

  const [lastDeletedRow, setLastDeletedRow] = useState(null);

  const [savedPrompts, setSavedPrompts] = useState(() => readSavedPrompts());

  const [showPromptsModal, setShowPromptsModal] = useState(false);

  // Draft is a working copy while the modal is open
  const [promptDrafts, setPromptDrafts] = useState([]);

  const [copiedPromptId, setCopiedPromptId] = useState(null);

  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem("dark-mode");
    if (saved !== null) return saved === "true";
    return window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false;
  });

  const [toast, setToast] = useState(null);

  const openPromptsModal = () => {
    // Deep-clone so edits don't mutate saved state until Save
    setPromptDrafts(
      savedPrompts.length
        ? savedPrompts.map((p) => ({ ...p }))
        : [{ id: crypto.randomUUID(), title: "", content: "" }],
    );
    setShowPromptsModal(true);
  };

  const closePromptsModal = () => {
    setShowPromptsModal(false);
  };

  const addPromptDraft = () => {
    setPromptDrafts((prev) => [
      ...prev,
      { id: crypto.randomUUID(), title: "", content: "" },
    ]);
  };

  const removePromptDraft = (id) => {
    setPromptDrafts((prev) => prev.filter((p) => p.id !== id));
  };

  const updatePromptDraft = (id, field, value) => {
    setPromptDrafts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, [field]: value } : p)),
    );
  };

  const savePrompts = () => {
    const cleaned = promptDrafts.filter(
      (p) => p.title.trim() || p.content.trim(),
    );
    setSavedPrompts(cleaned);
    localStorage.setItem(SAVED_PROMPTS_KEY, JSON.stringify(cleaned));
    setShowPromptsModal(false);
    showToast("Prompts saved");
  };

  const copyPrompt = async (prompt) => {
    await navigator.clipboard.writeText(prompt.content);
    setCopiedPromptId(prompt.id);
    showToast(`Copied "${prompt.title || "Untitled"}"`);
    setTimeout(() => setCopiedPromptId((prev) => (prev === prompt.id ? null : prev)), 2000);
  };

  const showToast = (message, type = "success") => {
    setToast({
      message,
      type,
    });
  };

  useEffect(() => {
    if (!toast) return;

    const timer = setTimeout(() => {
      setToast(null);
    }, 3000);

    return () => clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    const payload = {
      fixedPrompt,
      batchSize,
      rows,
      batches,
      finalInputs,
      finalInputDone,
      selectedLayers,
      searchText,
      showBatches,
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  }, [
    fixedPrompt,
    batchSize,
    rows,
    batches,
    finalInputs,
    finalInputDone,
    selectedLayers,
    searchText,
    showBatches,
  ]);

  useEffect(() => {
    localStorage.setItem("dark-mode", String(darkMode));
    document.documentElement.setAttribute(
      "data-theme",
      darkMode ? "dark" : "light",
    );
  }, [darkMode]);

  const cleanText = (text = "") => {
    return text
      .replace(/\*\*/g, "")
      .replace(/__/g, "")
      .replace(/`/g, "")
      .trim();
  };

  const createRow = (layer, script, prompt) => ({
    id: crypto.randomUUID(),
    layer: cleanText(layer),
    script: cleanText(script),
    prompt: cleanText(prompt),
  });

  const parseTsvTable = (lines) => {
    const parsed = [];

    lines.forEach((line, index) => {
      const cols = line.split("\t");

      if (cols.length < 3) return;

      const firstCell = cols[0]?.trim().toLowerCase();

      if (index === 0 && firstCell === "layer") {
        return;
      }

      parsed.push(createRow(cols[0], cols[1], cols.slice(2).join(" ")));
    });

    return parsed;
  };

  const parseMarkdownTable = (lines) => {
    const parsed = [];

    const dataLines = lines.filter(
      (line) => line.startsWith("|") && !line.includes("---"),
    );

    dataLines.forEach((line, index) => {
      const cols = line
        .split("|")
        .map((c) => c.trim())
        .filter(Boolean);

      if (cols.length < 3) return;

      if (index === 0 && cols[0].toLowerCase() === "layer") {
        return;
      }

      parsed.push(createRow(cols[0], cols[1], cols.slice(2).join(" | ")));
    });

    return parsed;
  };

  const parseTable = (text) => {
    const lines = text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    if (!lines.length) return [];

    const isMarkdownTable =
      lines.some((line) => line.startsWith("|")) &&
      lines.some((line) => line.includes("---"));

    return isMarkdownTable ? parseMarkdownTable(lines) : parseTsvTable(lines);
  };

  const handlePaste = (e) => {
    e.preventDefault();

    const text = e.clipboardData.getData("text");

    const importedRows = parseTable(text);

    if (!importedRows.length) {
      showToast("No valid rows found", "error");
      return;
    }

    setRows((prevRows) => {
      const existingKeys = new Set(
        prevRows.map((row) => `${row.layer}|${row.script}|${row.prompt}`),
      );

      const uniqueRows = [];

      let duplicateCount = 0;

      importedRows.forEach((row) => {
        const key = `${row.layer}|${row.script}|${row.prompt}`;

        if (existingKeys.has(key)) {
          duplicateCount++;
          return;
        }

        existingKeys.add(key);

        uniqueRows.push(row);
      });

      if (duplicateCount > 0) {
        showToast(
          `Imported ${uniqueRows.length} rows • Skipped ${duplicateCount} duplicates`,
          "warning",
        );
      } else {
        showToast(`Imported ${uniqueRows.length} rows`);
      }

      return [...prevRows, ...uniqueRows];
    });
  };

  const uniqueLayers = useMemo(() => {
    return [...new Set(rows.map((row) => row.layer))];
  }, [rows]);

  const layerColorMap = useMemo(() => {
    const map = {};
    const palette = darkMode ? DARK_COLORS : COLORS;

    uniqueLayers.forEach((layer, index) => {
      map[layer] = palette[index % palette.length];
    });

    return map;
  }, [uniqueLayers, darkMode]);

  const filteredRows = useMemo(() => {
    let result = rows;

    if (selectedLayers.length) {
      result = result.filter((row) => selectedLayers.includes(row.layer));
    }

    if (searchText.trim()) {
      const query = searchText.toLowerCase();

      result = result.filter((row) =>
        [row.layer, row.script, row.prompt]
          .join(" ")
          .toLowerCase()
          .includes(query),
      );
    }

    return result;
  }, [rows, selectedLayers, searchText]);

  const toggleLayer = (layer) => {
    setSelectedLayers((prev) => {
      if (prev.includes(layer)) {
        return prev.filter((l) => l !== layer);
      }

      return [...prev, layer];
    });
  };

  const selectAllLayers = () => {
    setSelectedLayers(uniqueLayers);
  };

  const clearLayerFilters = () => {
    setSelectedLayers([]);
  };

  const removeRow = (rowId) => {
    setRows((prev) => {
      const removeIndex = prev.findIndex((row) => row.id === rowId);

      if (removeIndex === -1) return prev;

      const removedRow = prev[removeIndex];

      setLastDeletedRow({
        row: removedRow,
        index: removeIndex,
      });

      return prev.filter((row) => row.id !== rowId);
    });

    showToast("Row removed. Use Undo to restore.", "warning");
  };

  const buildBatches = (sourceRows) => {
    const generated = [];

    for (let i = 0; i < sourceRows.length; i += batchSize) {
      generated.push(sourceRows.slice(i, i + batchSize));
    }

    return generated;
  };

  const undoDeleteRow = () => {
    if (!lastDeletedRow) return;

    setRows((prev) => {
      const next = [...prev];
      next.splice(lastDeletedRow.index, 0, lastDeletedRow.row);
      return next;
    });

    setLastDeletedRow(null);

    showToast("Row restored");
  };

  const handleBatchSizeChange = (value) => {
    const parsed = Number(value);

    if (!Number.isFinite(parsed)) {
      setBatchSize(DEFAULT_BATCH_SIZE);
      return;
    }

    setBatchSize(Math.max(1, Math.min(128, Math.floor(parsed))));
  };

  useEffect(() => {
    if (!showBatches) return;

    setBatches(buildBatches(rows));
  }, [rows, showBatches, batchSize]);

  const toggleBatches = () => {
    setShowBatches((prev) => {
      const next = !prev;

      if (next) {
        setBatches(buildBatches(rows));
      }

      return next;
    });
  };

  const generateFinalInputs = () => {
    const generatedBatches = buildBatches(rows);

    if (!generatedBatches.length) {
      showToast("No rows to generate final inputs", "warning");
      return;
    }

    setBatches(generatedBatches);

    const outputs = generatedBatches.map((batch, batchIndex) => {
      const scenePrompts = batch
        .map((row, index) => `Scene Prompt ${index + 1}: ${row.prompt}`)
        .join("\n\n");

      return {
        id: batchIndex + 1,
        text: `${fixedPrompt}

${scenePrompts}`,
      };
    });

    setFinalInputs(outputs);
    setFinalInputDone({});

    setCopiedItems({});

    showToast(`Generated ${outputs.length} final inputs`);
  };

  const copyToClipboard = async (text, label) => {
    await navigator.clipboard.writeText(text);

    setCopiedItems((prev) => ({
      ...prev,
      [label]: true,
    }));

    showToast(`Copied ${label}`);
  };

  const toggleFinalInputDone = (inputId) => {
    setFinalInputDone((prev) => ({
      ...prev,
      [inputId]: !prev[inputId],
    }));
  };

  const copyAllFinalInputs = async () => {
    const combined = finalInputs
      .map(
        (input) =>
          `===== FINAL INPUT ${input.id} =====

${input.text}`,
      )
      .join("\n\n\n");

    await navigator.clipboard.writeText(combined);

    setCopiedItems((prev) => ({
      ...prev,
      all: true,
    }));

    showToast("Copied all final inputs");
  };

  const downloadTxt = () => {
    const combined = finalInputs
      .map(
        (input) =>
          `===== FINAL INPUT ${input.id} =====

${input.text}`,
      )
      .join("\n\n\n");

    const blob = new Blob([combined], {
      type: "text/plain",
    });

    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");

    link.href = url;

    link.download = "final-inputs.txt";

    link.click();

    URL.revokeObjectURL(url);
  };

  const clearData = () => {
    setRows([]);
    setBatches([]);
    setFinalInputs([]);
    setFinalInputDone({});
    setSelectedLayers([]);
    setSearchText("");
    setShowBatches(false);
    setBatchSize(DEFAULT_BATCH_SIZE);
    setCopiedItems({});
    setLastDeletedRow(null);

    localStorage.removeItem(STORAGE_KEY);

    showToast("Data cleared");
  };

  const clearTable = () => {
    if (!window.confirm("Clear the entire table? This cannot be undone.")) return;

    setRows([]);
    setBatches([]);
    setFinalInputs([]);
    setFinalInputDone({});
    setSelectedLayers([]);
    setShowBatches(false);
    setCopiedItems({});
    setLastDeletedRow(null);

    showToast("Table cleared");
  };

  const getBatchNumber = (originalIndex) => {
    return Math.floor(originalIndex / batchSize) + 1;
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>Scene Prompt Batch Builder</h1>

        <div style={{ display: "flex", gap: 8 }}>
          <button
            className="btn-theme"
            onClick={openPromptsModal}
            title="Other fixed prompts"
          >
            📋 Saved Prompts
          </button>

          <button
            className="btn-theme"
            onClick={() => setDarkMode((d) => !d)}
            title="Toggle dark mode"
          >
            {darkMode ? "☀️ Light" : "🌙 Dark"}
          </button>
        </div>
      </header>

      {showPromptsModal && (
        <div className="modal-overlay" onClick={closePromptsModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Saved Prompts</h2>

              <button className="modal-close" onClick={closePromptsModal}>
                ✕
              </button>
            </div>

            <div className="modal-body">
              {promptDrafts.map((draft, index) => (
                <div key={draft.id} className="prompt-box">
                  <div className="prompt-box-header">
                    <input
                      type="text"
                      className="prompt-title-input"
                      placeholder={`Prompt ${index + 1} title…`}
                      value={draft.title}
                      onChange={(e) =>
                        updatePromptDraft(draft.id, "title", e.target.value)
                      }
                    />

                    <div style={{ display: "flex", gap: 6 }}>
                      <button
                        className={
                          copiedPromptId === draft.id
                            ? "btn-icon btn-icon-copied"
                            : "btn-icon"
                        }
                        title="Copy to clipboard"
                        onClick={() => copyPrompt(draft)}
                        disabled={!draft.content.trim()}
                      >
                        {copiedPromptId === draft.id ? "✓" : "⧉"}
                      </button>

                      <button
                        className="btn-icon btn-icon-remove"
                        title="Remove prompt"
                        onClick={() => removePromptDraft(draft.id)}
                      >
                        ✕
                      </button>
                    </div>
                  </div>

                  <textarea
                    className="prompt-box-textarea"
                    placeholder="Prompt content…"
                    value={draft.content}
                    onChange={(e) =>
                      updatePromptDraft(draft.id, "content", e.target.value)
                    }
                  />
                </div>
              ))}

              <button className="btn-add-prompt" onClick={addPromptDraft}>
                + Add Prompt
              </button>
            </div>

            <div className="modal-footer">
              <button onClick={closePromptsModal} className="btn-cancel">
                Cancel
              </button>

              <button onClick={savePrompts}>
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && <div className={`toast ${toast.type}`}>{toast.message}</div>}

      <div className="input-row">
        <section className="card">
          <h2>Fixed Prompt</h2>

          <textarea
            value={fixedPrompt}
            onChange={(e) => setFixedPrompt(e.target.value)}
            placeholder="Paste your fixed prompt here..."
          />

          <div className="actions" style={{ marginTop: 10, marginBottom: 0 }}>
            <button onClick={() => setFixedPrompt("")}>Reset Prompt</button>
          </div>
        </section>

        <section className="card">
          <h2>Paste Data</h2>

          <textarea
            placeholder="Paste Excel TSV or ChatGPT markdown table here..."
            onPaste={handlePaste}
          />

          <p style={{ marginTop: 8, color: "var(--text-muted)", fontSize: 13 }}>
            Paste automatically imports rows and removes duplicates.
          </p>
        </section>
      </div>

      <section className="stats">
        <div>Rows: {rows.length}</div>

        <div>Layers: {uniqueLayers.length}</div>

        <div>Batches: {Math.ceil(rows.length / batchSize)}</div>

        <div>Final Inputs: {finalInputs.length}</div>
      </section>

      <div className="filter-row">
        <section className="card filter-card">
          <h2>Layer Filters</h2>

          <div className="filter-container">
            <div className="legend">
              {uniqueLayers.map((layer) => (
                <label key={layer} className="legend-item">
                  <input
                    type="checkbox"
                    checked={selectedLayers.includes(layer)}
                    onChange={() => toggleLayer(layer)}
                  />

                  <span
                    className="legend-color"
                    style={{ backgroundColor: layerColorMap[layer] }}
                  />

                  {layer}
                </label>
              ))}
            </div>
            <div className="actions">
              <button onClick={selectAllLayers}>Select All</button>

              <button onClick={clearLayerFilters}>Clear Filters</button>
            </div>
          </div>
        </section>

        <section className="card search-card">
          <h2>Search</h2>

          <input
            className="search-box"
            type="text"
            placeholder="Search layer, script or prompt..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
        </section>
      </div>

      <section className="card">
        <div className="table-section-header">
          <h2>Master Table</h2>

          <div style={{ display: "flex", gap: 8 }}>
            <button
              className="undo-btn"
              onClick={undoDeleteRow}
              disabled={!lastDeletedRow}
            >
              ↩ Undo Delete
            </button>

            <button
              className="delete-btn"
              onClick={clearTable}
              disabled={!rows.length}
            >
              Clear Table
            </button>
          </div>
        </div>

        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Batch</th>

                <th>Layer</th>

                <th>Words From Script</th>

                <th>Scene Prompt</th>

                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {filteredRows.map((row) => {
                const originalIndex = rows.findIndex((r) => r.id === row.id);

                const batchNumber = getBatchNumber(originalIndex);

                const isBatchEnd = (originalIndex + 1) % batchSize === 0;

                return (
                  <tr
                    key={row.id}
                    className={isBatchEnd ? "batch-row" : ""}
                    style={{ backgroundColor: layerColorMap[row.layer] }}
                  >
                    <td>{batchNumber}</td>

                    <td>{row.layer}</td>

                    <td>{row.script}</td>

                    <td>{row.prompt}</td>

                    <td>
                      <button
                        className="delete-btn"
                        onClick={() => removeRow(row.id)}
                      >
                        ❌
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card">
        <div className="actions">
          <button onClick={toggleBatches} disabled={!rows.length}>
            {showBatches ? "Hide Batches" : "Show Batches"}
          </button>

          <label className="batch-size-inline">
            Batch Size
            <input
              type="number"
              min="1"
              max="128"
              value={batchSize}
              onChange={(e) => handleBatchSizeChange(e.target.value)}
            />
          </label>

          <button onClick={generateFinalInputs} disabled={!rows.length}>
            Generate Final Inputs
          </button>

          <button onClick={clearData}>Clear All Data</button>
        </div>

        {showBatches &&
          batches.map((batch, index) => (
            <details key={index} className="batch-preview">
              <summary>
                Batch {index + 1}
                {" • "}
                {batch.length} rows
              </summary>

              <table>
                <thead>
                  <tr>
                    <th>Layer</th>

                    <th>Words From Script</th>

                    <th>Scene Prompt</th>
                  </tr>
                </thead>

                <tbody>
                  {batch.map((row) => (
                    <tr key={row.id}>
                      <td>{row.layer}</td>

                      <td>{row.script}</td>

                      <td>{row.prompt}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </details>
          ))}
      </section>

      {finalInputs.length > 0 && (
        <section className="card">
          <div className="output-header">
            <h2>Final Inputs</h2>

            <div className="actions" style={{ marginBottom: 0 }}>
              <button
                className={copiedItems.all ? "btn-copied" : ""}
                onClick={copyAllFinalInputs}
              >
                {copiedItems.all ? "✓ Copied" : "Copy All"}
              </button>

              <button onClick={downloadTxt}>Export TXT</button>
            </div>
          </div>

          {finalInputs.map((input) => (
            <details key={input.id} className="output">
              <summary className="output-summary">
                <h3 className={finalInputDone[input.id] ? "output-title-done" : ""}>
                  Final Input #{input.id}
                </h3>

                <div className="output-summary-actions">
                  <button
                    className={
                      finalInputDone[input.id]
                        ? "done-toggle-btn done-toggle-btn-active"
                        : "done-toggle-btn"
                    }
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      toggleFinalInputDone(input.id);
                    }}
                  >
                    {finalInputDone[input.id] ? "✓ Done" : "Mark Done"}
                  </button>

                  <button
                    className={
                      copiedItems[`Final Input #${input.id}`] ? "btn-copied" : ""
                    }
                    onClick={(e) => {
                      e.preventDefault();
                      copyToClipboard(input.text, `Final Input #${input.id}`);
                    }}
                  >
                    {copiedItems[`Final Input #${input.id}`]
                      ? "✓ Copied"
                      : "Copy"}
                  </button>
                </div>
              </summary>

              <div className="output-content">
                <pre>{input.text}</pre>
              </div>
            </details>
          ))}
        </section>
      )}
    </div>
  );
}
