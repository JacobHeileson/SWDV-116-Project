// estimate.js - Jake's Outfitters calculator
document.addEventListener("DOMContentLoaded", () => {
  // wire up events
  document.getElementById("activity").addEventListener("change", onActivityChange);
  document.getElementById("calcButton").addEventListener("click", calculateEstimate);

  // Initialize visibility
  onActivityChange();
});

// Pricing constants (finalized)
const PRICES = {
  huntingSpecies: {
    whitetail: 1000,
    mule: 1200,
    bear: 1500,
    elk: 2500,
    moose: 3000,
    turkey: 400
  },
  fishingPerGuestPerDay: 100,   // $100 per guest per day
  guide: {
    one: 200,    // 1 guide per day
    two: 350     // 2 guides per day
  },
  gear: {
    full: 75,    // per person per day
    partial: 35
  },
  lodgePerNight: 350,          // flat per night (any activity)
  campingPerNightFreeRange: 0, // free-range is free
  processingPerAnimal: {       // used only for hunting if you later enable processing
    whitetail: 150,
    mule: 150,
    bear: 200,
    elk: 300,
    moose: 400,
    turkey: 50
  }
};

// Helper: show/hide DOM groups
function show(id) { document.getElementById(id).style.display = ""; }
function hide(id) { document.getElementById(id).style.display = "none"; }

// Show/hide fields based on activity selection
function onActivityChange() {
  const activity = document.getElementById("activity").value;

  // Default: show everything, then hide as needed
  show("guestsGroup");
  show("gearGroup");
  show("campingTypeGroup");
  show("nightsGroup");
  show("daysGroup");
  show("guidesGroup");

  if (activity === "hunt") {
    show("speciesGroup");
    show("tagGroup");
    show("guestNote");
    show("guidesGroup");
  } else if (activity === "fish") {
    hide("speciesGroup");
    hide("tagGroup");
    show("guestNote");
    show("guidesGroup");
  } else if (activity === "both") {
    show("speciesGroup");
    show("tagGroup");
    show("guestNote");
    show("guidesGroup");
  } else if (activity === "camp") {
    // camping-only: hide hunting/fishing-specific fields and guides
    hide("speciesGroup");
    hide("tagGroup");
    // For camping-only, guides are not offered
    hide("guidesGroup");
    // guests still shown (they are additional to tag holders, but tag holders don't apply)
    // days/nights remain
  }

  // Ensure guest note text is appropriate
  const guestNote = document.getElementById("guestNote");
  if (activity === "hunt") {
    guestNote.textContent = "For hunting: guests allowed = number of tag holders (helpers).";
    show("guestNote");
  } else {
    guestNote.textContent = "Guests are additional people in your party.";
    show("guestNote");
  }
}

// Main calculation function
function calculateEstimate() {
  const activity = document.getElementById("activity").value;
  const species = document.getElementById("species").value;
  let tagHolders = Number(document.getElementById("tagHolders").value) || 0;
  let guests = Number(document.getElementById("guests").value) || 0;
  const guides = Number(document.getElementById("guides").value) || 0;
  const gear = document.getElementById("gear").value;
  const days = Number(document.getElementById("days").value) || 1;
  const nights = Number(document.getElementById("nights").value) || 0;
  const campType = document.getElementById("campType").value;

  // If camping only, tagHolders should be treated as 0 (and tag input may be visible but irrelevant)
  if (activity === "camp") {
    tagHolders = 0;
  } else if (activity === "fish") {
    // fishing-only: there are no tag holders (depends on your UX); we treat tagHolders as 0
    tagHolders = 0;
  } else {
    // hunting or both: tagHolders must be >= 1
    if (tagHolders < 1) {
      showError("For hunting, enter at least 1 tag holder.");
      return;
    }
  }

  // Guest limit enforcement for hunting (guests ≤ tagHolders)
  if ((activity === "hunt" || activity === "both") && guests > tagHolders) {
    showError(`Guest limit exceeded. For hunting, guests must be ≤ tag holders (${tagHolders}).`);
    return;
  }

  // Clear previous error/output
  clearError();

  // Start tally
  let breakdownLines = [];
  let total = 0;

  // --- Hunting cost (species price × tag holders) ---
  if (activity === "hunt" || activity === "both") {
    const pricePerTag = PRICES.huntingSpecies[species] || 0;
    const huntingCost = pricePerTag * tagHolders;
    total += huntingCost;
    breakdownLines.push(`Hunting (${species}) : $${huntingCost.toLocaleString()}`);
  }

  // --- Fishing cost (flat $100 × guests × days) ---
  if (activity === "fish" || activity === "both") {
    // fishing fee is per guest per day — interpret "tag holders" as participants only for hunting
    // If 'both' and there are tagHolders, assume guests may include anglers — we'll charge fishing per guest only
    // We'll interpret participants for fishing as (guests + tagHolders) if the user expects tag holders to fish too.
    // To be conservative/useful: charge fishing for total participants = (tagHolders + guests) when activity includes fishing.
    const participantsForFishing = (tagHolders + guests) || 0;
    const fishingCost = PRICES.fishingPerGuestPerDay * participantsForFishing * days;
    total += fishingCost;
    breakdownLines.push(`Fishing (${participantsForFishing} people × ${days} days): $${fishingCost.toLocaleString()}`);
  }

  // --- Guides ---
  if (activity !== "camp") { // guides not offered for camping-only
    if (guides === 1) {
      const g = PRICES.guide.one * days;
      total += g;
      breakdownLines.push(`Guide (1 × ${days} days): $${g.toLocaleString()}`);
    } else if (guides === 2) {
      const g = PRICES.guide.two * days;
      total += g;
      breakdownLines.push(`Guides (2 × ${days} days): $${g.toLocaleString()}`);
    }
  }

  // --- Gear packages (applies to tagHolders + guests) ---
  const peopleCovered = (tagHolders + guests) || 0;
  if (gear === "full") {
    const gcost = PRICES.gear.full * peopleCovered * days;
    total += gcost;
    breakdownLines.push(`Full Gear (${peopleCovered} people × ${days} days): $${gcost.toLocaleString()}`);
  } else if (gear === "partial") {
    const gcost = PRICES.gear.partial * peopleCovered * days;
    total += gcost;
    breakdownLines.push(`Partial Gear (${peopleCovered} people × ${days} days): $${gcost.toLocaleString()}`);
  }

  // --- Lodge surcharge (applies regardless of activity if lodge selected) ---
  if (campType === "lodge") {
    const lodgeCost = PRICES.lodgePerNight * nights;
    total += lodgeCost;
    breakdownLines.push(`Lodge (${nights} nights × $${PRICES.lodgePerNight}): $${lodgeCost.toLocaleString()}`);
  } else {
    breakdownLines.push(`Free-range camping: $0`);
  }

  // --- Meat processing (applies only to hunting; optional ) ---
// --- Optional meat processing ---
const wantsProcessing = document.getElementById("processing").checked;

if ((activity === "hunt" || activity === "both") && wantsProcessing) {
    const procPerAnimal = PRICES.processingPerAnimal[species] || 0;
    const processCost = procPerAnimal * tagHolders;
    total += processCost;
    breakdownLines.push(`Meat Processing (${tagHolders} × $${procPerAnimal}): $${processCost.toLocaleString()}`);
}


  // --- If camping-only and all else zero, make sure to show nights cost if lodge chosen ---
  if (activity === "camp" && campType === "lodge" && nights > 0) {
    // already handled above
  }

  // Final output
  document.getElementById("estimateOutput").textContent = `Estimated Total: $${total.toLocaleString()}`;

  // Show breakdown
  document.getElementById("breakdown").innerHTML = breakdownLines.map(l => `<div>${l}</div>`).join("");

  // scroll into view (helpful on mobile)
  document.getElementById("estimateOutput").scrollIntoView({ behavior: "smooth", block: "center" });
}

// Error handling
function showError(msg) {
  const out = document.getElementById("estimateOutput");
  out.textContent = "Error: " + msg;
  out.style.color = "#b91c1c"; // red-ish
  document.getElementById("breakdown").innerHTML = "";
}

function clearError() {
  const out = document.getElementById("estimateOutput");
  out.textContent = "";
  out.style.color = ""; // reset
  document.getElementById("breakdown").innerHTML = "";
}
