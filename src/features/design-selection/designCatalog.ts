import type { BuiltInGarmentDesignFamily, GarmentDesignCategory, GarmentDesignOption } from './designSelectionTypes';

type CategorySeed = {
  name: string;
  description: string;
  options: string[];
  required?: boolean;
  multiple?: boolean;
};

const suitSeeds: CategorySeed[] = [
  {
    name: 'Lapel Design',
    description: 'Choose the jacket lapel shape that defines the suit front.',
    required: true,
    options: ['Notch Lapel', 'Peak Lapel', 'Shawl Lapel', 'Slim Notch', 'Wide Peak', 'Wide Curved Peak'],
  },
  {
    name: 'Satin Lapel',
    description: 'Add tuxedo-style satin details when the occasion needs extra formality.',
    options: ['No Satin', 'Satin Lapel', 'Satin Collar', 'Satin Chest Pocket Trim'],
  },
  {
    name: 'Jacket Pocket',
    description: 'Select the main lower pocket style for the jacket.',
    required: true,
    options: ['Flap Pocket', 'Jetted Pocket', 'Patch Pocket', 'Slanted Pocket', 'Ticket Pocket', 'Patch With Flap'],
  },
  {
    name: 'Chest Pocket',
    description: 'Choose the upper jacket pocket treatment.',
    options: ['Welt Chest Pocket', 'Patch Chest Pocket', 'No Chest Pocket'],
  },
  {
    name: 'Shoulder Type',
    description: 'Set the jacket shoulder structure and silhouette.',
    options: ['Natural Shoulder', 'Soft Shoulder', 'Structured Shoulder', 'Padded Shoulder', 'Roped Shoulder'],
  },
  {
    name: 'Buttoning Style',
    description: 'Choose the front button arrangement for the jacket.',
    required: true,
    options: ['Single Breasted 1 Button', 'Single Breasted 2 Button', 'Single Breasted 3 Button', 'Double Breasted 4 Button', 'Double Breasted 6 Button', 'Tuxedo Button'],
  },
  {
    name: 'Vent Style',
    description: 'Choose the back vent construction for movement and drape.',
    options: ['No Vent', 'Single Vent', 'Double Vent'],
  },
  {
    name: 'Sleeve Button',
    description: 'Choose sleeve button count and finishing detail.',
    options: ['3 Button Sleeve', '4 Button Sleeve', 'Kissing Buttons', 'Working Buttonholes'],
  },
  {
    name: 'Lining Style',
    description: 'Choose the jacket lining coverage and visual treatment.',
    options: ['No Lining', 'Half Lining', 'Full Lining', 'Contrast Lining', 'Printed Lining'],
  },
  {
    name: 'Trouser Front',
    description: 'Choose the trouser front construction paired with the suit.',
    options: ['Flat Front', 'Single Pleat', 'Double Pleat'],
  },
  {
    name: 'Trouser Waist',
    description: 'Choose how the suit trouser waistband will be finished.',
    options: ['Belt Loops', 'Side Adjusters', 'Suspender Buttons', 'Extended Tab'],
  },

  {
    name: 'Trouser Bottom',
    description: 'Choose the trouser bottom opening and hem finish.',
    options: ['Plain Hem', 'Turn Up', 'French Cuff', 'Narrow Opening', 'Wide Opening'],
  },
  {
    name: 'Fit Type',
    description: 'Choose the overall suit fit target before measurement confirmation.',
    required: true,
    options: ['Slim Fit', 'Tailored Fit', 'Classic Fit', 'Relaxed Fit'],
  },
];

const shirtSeeds: CategorySeed[] = [
  {
    name: 'Collar Type',
    description: 'Choose the shirt collar shape and neck presentation.',
    required: true,
    options: ['Spread', 'Semi Spread', 'Cutaway', 'Button Down', 'Mandarin', 'Club', 'Wing'],
  },
  {
    name: 'Cuff Type',
    description: 'Choose the cuff shape and fastening style.',
    required: true,
    options: ['Single Round', 'Single Angle', 'Double Round', 'Double Angle', 'French Cuff', 'Convertible Cuff'],
  },
  {
    name: 'Sleeve Type',
    description: 'Choose the sleeve length before entering sleeve measurements.',
    required: true,
    options: ['Full Sleeve', 'Half Sleeve', 'Short Sleeve', 'Sleeveless'],
  },
  {
    name: 'Pocket Type',
    description: 'Choose the shirt pocket treatment.',
    options: ['No Pocket', 'Patch Rounded', 'Patch Angled', 'Chest Pocket With Flap', 'Hidden Pocket'],
  },
  {
    name: 'Placket Style',
    description: 'Choose the shirt front button placket finish.',
    options: ['Front Placket', 'Hidden Placket', 'French Placket', 'Tuxedo Placket', 'Polo Placket'],
  },
  {
    name: 'Back Pleat',
    description: 'Choose back pleat shaping for movement and comfort.',
    options: ['No Pleat', 'Box Pleat', 'Side Pleat', 'Center Pleat'],
  },
  {
    name: 'Yoke Style',
    description: 'Choose the shoulder yoke construction.',
    options: ['Plain Yoke', 'Split Yoke', 'Western Yoke', 'Seamless Back Yoke'],
  },
  {
    name: 'Bottom Hem Style',
    description: 'Choose the shirt bottom shape.',
    options: ['Curved Hem', 'Straight Hem', 'Square Hem', 'Tail Hem'],
  },
  {
    name: 'Fit Type',
    description: 'Choose the shirt fit target before measurements.',
    required: true,
    options: ['Slim Fit', 'Tailored Fit', 'Classic Fit', 'Relaxed Fit'],
  },
  {
    name: 'Front Style',
    description: 'Choose the shirt front presentation and formal detailing.',
    options: ['Plain Front', 'No Placket Concealed', 'Tuxedo Front', 'Pintuck Front', 'Bib Front'],
  },
  {
    name: 'Button Style',
    description: 'Choose the visible shirt button material or finish.',
    options: ['Mother of Pearl', 'Resin', 'Metal', 'Horn', 'Fabric Covered'],
  },
  {
    name: 'Monogram / Embroidery',
    description: 'Choose optional monogram or embroidery placement.',
    multiple: true,
    options: ['No Monogram', 'Left Chest Above Pocket', 'Left Chest On Pocket', 'Right Cuff', 'Lower Front Hem'],
  },
  {
    name: 'Contrast Options',
    description: 'Choose optional contrast fabric or stitch details.',
    multiple: true,
    options: ['Contrast Collar Inner', 'Contrast Cuff Inner', 'Contrast Placket Inner', 'Contrast Stitch Thread'],
  },
  {
    name: 'Additional Details',
    description: 'Choose construction details that support the desired finish.',
    multiple: true,
    options: ['Collar Stay', 'Cuff Links', 'Placket Interlining', 'Soft Interlining', 'Standard Interlining'],
  },
];

const pantSeeds: CategorySeed[] = [
  {
    name: 'Front Style',
    description: 'Choose the trouser front pleat construction.',
    required: true,
    options: ['Flat Front', 'Single Pleat', 'Double Pleat', 'Triple Pleat'],
  },
  {
    name: 'Waistband Style',
    description: 'Choose the trouser waistband shape.',
    required: true,
    options: ['Standard Waistband', 'Extended Tab', 'Side Tab', 'High Waist'],
  },
  {
    name: 'Belt / Adjuster',
    description: 'Choose belt loops, side adjusters, or suspender buttons.',
    options: ['Belt Loops', 'Side Adjusters', 'Double Side Adjusters', 'Suspender Buttons'],
  },
  {
    name: 'Front Pocket',
    description: 'Choose the front pocket style.',
    options: ['Slash Pocket', 'Slanted Pocket', 'J-Pocket', 'L-Pocket', 'Ticket Pocket'],
  },
  {
    name: 'Back Pocket',
    description: 'Choose the back pocket treatment.',
    options: ['Single Welt', 'Double Welt', 'Button Through', 'Flap Pocket', 'No Pocket'],
  },
  {
    name: 'Fly Type',
    description: 'Choose zipper, button, or extended fly construction.',
    options: ['Zipper Fly', 'Button Fly', 'Extended Button Fly'],
  },
  {
    name: 'Bottom Opening / Cuff',
    description: 'Choose the trouser bottom finish.',
    options: ['Plain Hem', 'Turn Up 3.5cm', 'Turn Up 5cm', 'French Cuff'],
  },
  {
    name: 'Crease Style',
    description: 'Choose the pressing crease style.',
    options: ['No Crease', 'Half Crease', 'Full Crease', 'Double Crease'],
  },
  {
    name: 'Fit Type',
    description: 'Choose the trouser fit target before measurements.',
    required: true,
    options: ['Slim Fit', 'Tailored Fit', 'Classic Fit', 'Relaxed Fit'],
  },
  {
    name: 'Rise',
    description: 'Choose the waist rise preference.',
    options: ['Low Rise', 'Mid Rise', 'High Rise'],
  },
  {
    name: 'Lining',
    description: 'Choose trouser lining coverage.',
    options: ['No Lining', 'Knee Lining', 'Half Lining', 'Full Lining'],
  },
];

const panjabiSeeds: CategorySeed[] = [
  {
    name: 'Collar Type',
    description: 'Choose the panjabi collar shape.',
    required: true,
    options: ['Band Collar', 'Chinese Collar', 'Stand Collar', 'Spread Collar', 'Notch Collar'],
  },
  {
    name: 'Placket Style',
    description: 'Choose the panjabi front opening style.',
    required: true,
    options: ['Hidden Placket', 'Short Placket', 'Half Placket', 'Corner Placket', 'Full Placket', 'Fly Front'],
  },
  {
    name: 'Button Style',
    description: 'Choose the panjabi button material or fastening detail.',
    options: ['Fabric Button', 'Round Button', 'Metal Button', 'Wooden Button', 'Loop & Knot', 'Hidden Snap'],
  },
  {
    name: 'Sleeve / Cuff Style',
    description: 'Choose sleeve and cuff styling before measurement.',
    options: ['Sleeveless', 'Short Sleeve', 'Regular Sleeve', 'French Cuff', 'Single Cuff', 'Contrast Cuff'],
  },
  {
    name: 'Side Pocket',
    description: 'Choose side pocket placement and construction.',
    options: ['No Pocket', 'Side Seam Pocket', 'Inset Pocket', 'Slanted Pocket', 'Zipper Pocket'],
  },
  {
    name: 'Chest Pocket',
    description: 'Choose the chest pocket option.',
    options: ['No Pocket', 'Patch Pocket', 'Welt Pocket', 'Flap Pocket', 'Contrast Pocket'],
  },
  {
    name: 'Side Slit',
    description: 'Choose side slit depth and shape.',
    options: ['No Slit', 'Short Slit', 'Medium Slit', 'Deep Slit', 'Rounded Slit'],
  },
  {
    name: 'Hem / Bottom',
    description: 'Choose the lower edge shape.',
    options: ['Straight Cut', 'Rounded Hem', 'Curved Hem', 'High Low Hem', 'Angled Hem'],
  },
  {
    name: 'Embroidery / Detailing',
    description: 'Choose decorative details and embroidery treatment.',
    multiple: true,
    options: ['No Embroidery', 'Tone on Tone', 'Thread Work', 'Zari Work', 'Chikankari', 'Cut Work', 'Bead Work', 'Contrast Piping'],
  },
  {
    name: 'Front Style',
    description: 'Choose the front panel design.',
    options: ['Plain Front', 'Panel Front', 'Yoke Front', 'Angrakha Style', 'Asymmetric Front'],
  },
  {
    name: 'Fit Type',
    description: 'Choose the panjabi fit target before measurements.',
    required: true,
    options: ['Regular Fit', 'Slim Fit', 'Tailored Fit', 'Relaxed Fit'],
  },
  {
    name: 'Back Style',
    description: 'Choose the back construction.',
    options: ['Plain Back', 'Yoke Back', 'Box Pleat', 'Double Pleat'],
  },
  {
    name: 'Fabric Weight',
    description: 'Choose fabric weight expectation for construction notes.',
    options: ['Light Summer', 'Medium', 'Heavy Winter'],
  },
  {
    name: 'Lining / Interfacing',
    description: 'Choose lining and interfacing support.',
    options: ['No Lining', 'Partial Lining', 'Full Lining', 'Canvas Interfacing'],
  },
];

const genericSeeds: CategorySeed[] = [
  {
    name: 'Fit Type',
    description: 'Choose the overall fit target before measurements.',
    required: true,
    options: ['Slim Fit', 'Tailored Fit', 'Classic Fit', 'Relaxed Fit'],
  },
  {
    name: 'Pocket Style',
    description: 'Choose the main pocket treatment for this garment.',
    options: ['No Pocket', 'Patch Pocket', 'Welt Pocket', 'Flap Pocket'],
  },
  {
    name: 'Special Detailing',
    description: 'Choose optional customer-facing details.',
    multiple: true,
    options: ['No Extra Detail', 'Contrast Piping', 'Embroidery', 'Fabric Covered Button'],
  },
];

export const builtInDesignCatalog: Record<BuiltInGarmentDesignFamily, GarmentDesignCategory[]> = {
  suit: buildCategories('suit', suitSeeds),
  shirt: buildCategories('shirt', shirtSeeds),
  pant: buildCategories('pant', pantSeeds),
  panjabi: buildCategories('panjabi', panjabiSeeds),
  generic: buildCategories('generic', genericSeeds),
};

function buildCategories(garmentType: BuiltInGarmentDesignFamily, seeds: CategorySeed[]): GarmentDesignCategory[] {
  return seeds.map((seed, index) => {
    const categoryKey = keyFromLabel(seed.name);

    return {
      id: `${garmentType}_${categoryKey}`,
      garmentType,
      categoryKey,
      categoryName: seed.name,
      description: seed.description,
      selectionType: seed.multiple ? 'multiple' : 'single',
      required: Boolean(seed.required),
      sortOrder: index + 1,
      options: seed.options.map((name, optionIndex) => buildOption(categoryKey, seed.name, seed.description, name, optionIndex)),
    };
  });
}

function buildOption(
  categoryKey: string,
  categoryName: string,
  categoryDescription: string,
  optionName: string,
  optionIndex: number,
): GarmentDesignOption {
  const optionKey = keyFromLabel(optionName);
  const isNoneOption = /^no\b/i.test(optionName);

  return {
    id: `${categoryKey}_${optionKey}`,
    categoryKey,
    optionKey,
    optionName,
    description: isNoneOption
      ? `Keep ${categoryName.toLowerCase()} simple with ${optionName.toLowerCase()}.`
      : `${optionName} for ${categoryName.toLowerCase()}. ${categoryDescription}`,
    svgIconKey: `${categoryKey}_${optionKey}`,
    imageUrl: null,
    isDefault: optionIndex === 0,
    sortOrder: optionIndex + 1,
    metadata: {},
  };
}

export function keyFromLabel(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}
