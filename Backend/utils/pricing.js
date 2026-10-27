// Customization ke rules check karta hai aur ek item ka price nikalta hai
export const buildLine = (menuItem, rawChoices = []) => {
  if (!menuItem || !menuItem.isAvailable) {
    throw new Error(`${menuItem ? menuItem.name : "Item"} is not available right now`);
  }
  if (!Array.isArray(rawChoices)) throw new Error("Invalid customization");

  const picked = new Map(); // group ka naam -> chune hue labels
  for (const c of rawChoices) {
    if (!c || typeof c.group !== "string" || !Array.isArray(c.options)) {
      throw new Error("Invalid customization");
    }
    picked.set(c.group, new Set(c.options.map(String)));
  }

  const groupNames = new Set(menuItem.customizations.map((g) => g.name));
  for (const name of picked.keys()) {
    if (!groupNames.has(name)) throw new Error(`Unknown option group: ${name}`);
  }

  const choices = [];
  let extra = 0;

  for (const group of menuItem.customizations) {
    const labels = picked.get(group.name) || new Set();
    const known = new Set(group.options.map((o) => o.label));

    for (const label of labels) {
      if (!known.has(label)) throw new Error(`Invalid option "${label}" for ${group.name}`);
    }
    if (group.selection === "single" && labels.size > 1) {
      throw new Error(`Choose only one ${group.name}`);
    }
    if (group.isRequired && labels.size === 0) {
      throw new Error(`${group.name} is required`);
    }
    if (labels.size === 0) continue;

    const options = group.options.filter((o) => labels.has(o.label));
    extra += options.reduce((sum, o) => sum + o.priceDelta, 0);
    choices.push({ group: group.name, options: options.map((o) => o.label) });
  }

  return { choices, unitPrice: menuItem.price + extra };
};