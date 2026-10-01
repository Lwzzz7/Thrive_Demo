(() => {
  const prompts = [
    "Generative Watermarking.",
    "Welcome to our demo.",
    "Learning to Watermark Speech Synthesis.",
  ];
  const datasets = {
    ljspeech: {
      label: "LJSpeech",
      texts: ["in 1789 in less", "or Thomas Jefferson from", "and accepts the necessary", "which recommends additional personnel", "As Chief Executive, the"],
      indices: [36, 37, 53, 13, 26],
    },
    libritts: {
      label: "LibriTTS",
      texts: ["--Good night, husband!", "The stars began", "If ever his", "A gentle kick", "A full hour"],
      indices: [10, 16, 40, 66, 96],
    },
    aishell: {
      label: "AIShell",
      texts: ["加油站", "确定无疑", "设计出来", "很多人对", "快报讯"],
      indices: [30, 32, 81, 114, 131],
    },
  };
  const models = {
    qwen: {
      label: "QWEN3-TTS",
      promptDurations: [1.92, 1.60, 3.28],
    },
    dots: {
      label: "DOTS.TTS",
      promptDurations: [1.60, 1.44, 2.72],
    },
  };

  const experiment = document.getElementById("experiment");
  const custom = document.getElementById("custom");
  // Both sets share the comparison card layout while keeping independent controls.
  experiment.querySelector('[data-role="audio-layout-slot"]')
    .append(custom.querySelector(".audio-layout").cloneNode(true));
  const parameters = new URLSearchParams(window.location.search);
  const activeDataset = Object.hasOwn(datasets, parameters.get("dataset"))
    ? parameters.get("dataset") : "ljspeech";
  const dataset = datasets[activeDataset];
  const isMainDataset = activeDataset === "ljspeech";
  document.querySelectorAll("[data-dataset-nav]").forEach(link => {
    if (link.dataset.datasetNav === activeDataset) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  });
  document.querySelectorAll("[data-ljspeech-only]").forEach(element => {
    element.hidden = !isMainDataset;
  });
  if (!isMainDataset) {
    document.title = `Thrive · ${dataset.label} Audio Demo`;
    document.querySelector('[data-role="experiment-title"]').textContent =
      `${dataset.label} experimental examples`;
  }
  document.querySelector('[data-role="dataset-eyebrow"]').textContent =
    `${dataset.label.toUpperCase()} · ONE-SECOND EVALUATION SAMPLES`;
  const optionalText = (role, value) => {
    const element = document.querySelector(`[data-role="${role}"]`);
    if (element) element.textContent = value;
  };
  optionalText("experiment-description",
    `Five matched ${dataset.label} input texts, each synthesized by Qwen3-TTS and Dots.tts. For each model, all six baseline clips use that model's own clean speech.`);
  optionalText("source-label", `${dataset.label.toUpperCase()} · SOURCE INDICES`);
  optionalText("source-indices", dataset.indices.join(" · "));
  const validModel = value => Object.hasOwn(models, value) ? value : "qwen";
  const validSample = (value, count) => {
    const number = Number(value);
    return Number.isInteger(number) && number >= 1 && number <= count ? number : 1;
  };
  const collections = {
    experiment: {
      root: experiment,
      model: validModel(parameters.get("experiment_model")),
      sample: validSample(parameters.get("experiment_sample"), 5),
    },
    custom: {
      root: custom,
      model: validModel(parameters.get("model")),
      sample: validSample(parameters.get("prompt"), 3),
    },
  };
  const allPlayers = [...document.querySelectorAll("audio[data-audio]")];

  function assetPath(collectionName, collection, method) {
    const prefix = collectionName === "experiment"
      ? `./assets/experiment${isMainDataset ? "" : `/${activeDataset}`}`
      : "./assets";
    const sample = String(collection.sample).padStart(2, "0");
    return `${prefix}/${collection.model}/sample_${sample}/${method}.wav`;
  }

  function stopAllAudio() {
    allPlayers.forEach(player => {
      player.pause();
      player.currentTime = 0;
    });
  }

  function render(name) {
    const collection = collections[name];
    const { root, model, sample } = collection;
    stopAllAudio();
    root.querySelectorAll("button[data-model]").forEach(button => {
      button.setAttribute("aria-pressed", String(button.dataset.model === model));
    });
    root.querySelectorAll("button[data-sample]").forEach(button => {
      button.setAttribute("aria-pressed", String(Number(button.dataset.sample) === sample));
    });
    root.querySelector('[data-role="selected-model"]').textContent = models[model].label;
    root.querySelector('[data-role="selected-number"]').textContent = String(sample).padStart(2, "0");
    root.querySelector('[data-role="selected-prompt"]').textContent = name === "experiment"
      ? `“${dataset.texts[sample - 1]}”`
      : `“${prompts[sample - 1]}”`;
    root.querySelector('[data-role="selected-duration"]').textContent = name === "experiment"
      ? "≈ 1.00 s"
      : `${models[model].promptDurations[sample - 1].toFixed(2)} s`;
    if (name === "experiment") {
      root.querySelector(".reference-card p").textContent = `${models[model].label} clean speech used as the input for all six baselines in this sample.`;
      root.querySelectorAll(".group-heading span:last-child").forEach(label => {
        label.textContent = `Applied to ${models[model].label} speech`;
      });
    }
    root.querySelectorAll("audio[data-audio]").forEach(player => {
      player.src = assetPath(name, collection, player.dataset.audio);
      player.load();
    });
    root.querySelectorAll("a[data-download]").forEach(link => {
      link.href = assetPath(name, collection, link.dataset.download);
      link.download = `${name}_${name === "experiment" ? `${activeDataset}_` : ""}${model}_sample${sample}_${link.dataset.download}.wav`;
    });
    const url = new URL(window.location.href);
    if (name === "experiment") {
      url.searchParams.set("experiment_model", model);
      url.searchParams.set("experiment_sample", String(sample));
    } else {
      url.searchParams.set("model", model);
      url.searchParams.set("prompt", String(sample));
    }
    history.replaceState(null, "", url);
  }

  Object.entries(collections).forEach(([name, collection]) => {
    if (name === "custom" && !isMainDataset) return;
    collection.root.querySelectorAll("button[data-model]").forEach(button => {
      button.addEventListener("click", () => {
        if (collection.model !== button.dataset.model) {
          collection.model = button.dataset.model;
          render(name);
        }
      });
    });
    collection.root.querySelectorAll("button[data-sample]").forEach(button => {
      button.addEventListener("click", () => {
        const selected = Number(button.dataset.sample);
        if (collection.sample !== selected) {
          collection.sample = selected;
          render(name);
        }
      });
    });
    render(name);
  });

  allPlayers.forEach(player => {
    player.addEventListener("play", () => {
      allPlayers.forEach(other => { if (other !== player) other.pause(); });
    });
  });
})();
