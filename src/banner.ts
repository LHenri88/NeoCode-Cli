import chalk from 'chalk';
import gradient from 'gradient-string';

const ESC = '\x1b[';
const HIDE_CURSOR = `${ESC}?25l`;
const SHOW_CURSOR = `${ESC}?25h`;
const MOVE_UP = (n: number) => `${ESC}${n}A`;
const CLEAR_LINE = `${ESC}2K`;

const matrixGreen = gradient(['#003300', '#009900', '#00cc00', '#00ff00', '#00cc00', '#009900']);

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const RAIN_CHARS = 'ｦｧｨｩｪｫｬｭｮｯｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ012345789:・."=*+-<>¦|';
function rndChar() {
    return RAIN_CHARS[Math.floor(Math.random() * RAIN_CHARS.length)]!;
}

const LOGO_NEOCODE = [
    `    ███╗   ██╗███████╗██████╗  ██████╗ ██████╗ ██████╗ ███████╗    `,
    `    ████╗  ██║██╔════╝██╔═══██╗██╔════╝██╔═══██╗██╔══██╗██╔════╝    `,
    `    ██╔██╗ ██║█████╗  ██║   ██║██║     ██║   ██║██║  ██║█████╗      `,
    `    ██║╚██╗██║██╔══╝  ██║   ██║██║     ██║   ██║██║  ██║██╔══╝      `,
    `    ██║ ╚████║███████╗╚██████╔╝╚██████╗╚██████╔╝██████╔╝███████╗    `,
    `    ╚═╝  ╚═══╝╚══════╝ ╚═════╝  ╚═════╝ ╚═════╝ ╚═════╝ ╚══════╝    `
];

const SCENE_BASE = [
    `           10101                    101                    01010        `,
    `     ▗▖     ▗▖                                               ▗▖         `,
    `    ▗██▖   ▗██▖         010               101               ▗██▖        `,
    `    ▐██▌   ▐██▌                                             ▐██▌        `,
    `    ████   ████                                            ▐████▌       `,
    `   ▐████▌ ▐████▌                  010               ▀██████===███▄      `,
    `   ██████ ██████                                            ██████      `,
    `   ██████ ██████                                            ██████      `,
];

function buildBanner(frame: number, isLastFrame: boolean, language: string): string[] {
    let lines: string[] = [];

    // 1. Generous top spacing
    lines.push('');
    lines.push('');

    // 2. NEOCODE Logo
    LOGO_NEOCODE.forEach(line => {
        // We pad to center it roughly in an 80-col terminal
        const padded = line.padStart(line.length + Math.floor((80 - line.length) / 2), ' ');
        lines.push(matrixGreen(padded));
    });

    lines.push('');

    // 3. Scene (Agents + Neo)
    SCENE_BASE.forEach(line => {
        let currentLine = line;

        if (!isLastFrame) {
            // Glitch effect on Agents & Neo block chars sometimes
            if (Math.random() > 0.6) {
                currentLine = currentLine.replace(/██/g, () => Math.random() > 0.5 ? '█ ' : ' ██');
            }

            // Glitch Neo's arm
            if (Math.random() > 0.5) {
                currentLine = currentLine.replace('▀██████===███▄', '▀████===███▄  ');
            } else if (Math.random() > 0.7) {
                currentLine = currentLine.replace('▀██████===███▄', '▀██████==██_▄ ');
            }

            // Replace 1/0 with matrix rain chars optionally
            currentLine = currentLine.replace(/[01]+/, match => {
                return Array.from({ length: match.length }).map(() => rndChar()).join('');
            });

            // Inject some rain in empty spaces
            const chars = currentLine.split('');
            for (let i = 0; i < chars.length; i++) {
                if (chars[i] === ' ' && Math.random() > 0.96) {
                    chars[i] = chalk.hex('#00ff00')(rndChar());
                }
            }
            currentLine = chars.join('');
        } else {
            // Final frame: clean up the 01 markers
            currentLine = currentLine.replace(/[01]/g, ' ');
        }

        // Pad to 80 chars
        const pureLength = currentLine.replace(/\x1b\[[^m]*m/g, '').length;
        const padTotal = Math.max(0, 80 - pureLength);
        const padded = ' '.repeat(Math.floor(padTotal / 2)) + currentLine + ' '.repeat(Math.ceil(padTotal / 2));

        // Apply matrix green if it's the solid block drawing or just full gradient
        // but the random rain chars in the glitch are already colored.
        if (isLastFrame) {
            lines.push(matrixGreen(padded));
        } else {
            // Apply gradient over the base text, but keep the bright rain characters
            lines.push(matrixGreen(padded));
        }
    });

    lines.push('');

    // 4. Tagline
    const taglines: Record<string, string> = {
        en: '✦ Wake up, Neo... Any model. Every tool. Multi Agents Orchestration. ✦',
        pt: '✦ Acorde, Neo... Qualquer modelo. Todas as ferramentas. Multi Agents ao seu Controle. ✦',
        es: '✦ Despierta, Neo... Cualquier modelo. Todas las herramientas. Multi Agents a tu Control. ✦'
    };

    const selectedTagline = taglines[language.toLowerCase()] || taglines['en'];
    const paddedTagline = selectedTagline.padStart(
        selectedTagline.length + Math.floor((80 - selectedTagline.length) / 2),
        ' '
    );

    // To avoid matrixGreen overriding when glitching, we always apply it
    lines.push(matrixGreen(paddedTagline));
    lines.push('');

    // 5. Divider and footer
    const divider = '─'.repeat(40);
    const paddedDivider = divider.padStart(divider.length + 20, ' ');
    lines.push(chalk.hex('#006600')(paddedDivider));

    const footer = 'Powered by MCP • Multi-Provider • Local-First • Zero Limits';
    const paddedFooter = footer.padStart(footer.length + Math.floor((80 - footer.length) / 2), ' ');
    lines.push(chalk.hex('#003300').bold(paddedFooter));
    lines.push('');

    return lines;
}

/**
 * Executes a micro-animation of the Matrix NeoCode banner and leaves it static.
 * @param language The desired tagline language ('en', 'pt', 'es').
 */
export async function printNeoCodeBanner(language: string = 'en') {
    const NUM_FRAMES = 6;
    const FRAME_DELAY = 350; // Total ~ 2.1 seconds

    // Try retrieving i18next translation if provided dynamically in environment/context
    // Fallback to the parameter
    let lang = language;

    process.stdout.write(HIDE_CURSOR);

    try {
        for (let frame = 0; frame < NUM_FRAMES; frame++) {
            const isLastFrame = frame === NUM_FRAMES - 1;
            const bannerLines = buildBanner(frame, isLastFrame, lang);

            const frameStr = bannerLines.join('\n');
            process.stdout.write(CLEAR_LINE + frameStr);

            if (!isLastFrame) {
                await sleep(FRAME_DELAY);
                // Move cursor back up to overwrite
                process.stdout.write(MOVE_UP(bannerLines.length - 1) + '\r');
            }
        }
        process.stdout.write('\n'); // push it down after final
    } finally {
        process.stdout.write(SHOW_CURSOR);
    }
}
