import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import html2canvas from 'html2canvas';
import api from '../../api/axiosConfig';
import { useAppDialog } from '../../contexts/DialogContext';

type Category = {
  id: string;
  nombre: string;
  ramas?: { id: string; nombre: string; disciplina: string } | null;
};

type Player = {
  id: string;
  nombre: string;
  posicion_cancha?: string | null;
  posicion_principal?: string | null;
  rol_especialidad?: string | null;
};

type BoardToken = {
  id: string;
  kind: 'player' | 'ball' | 'cone';
  playerId?: string;
  label: string;
  x: number;
  y: number;
};

type BoardStroke = {
  id: string;
  kind: 'draw' | 'arrow';
  points: number[];
  color: string;
  width: number;
};

type BoardContent = {
  version: 1;
  tokens: BoardToken[];
  strokes: BoardStroke[];
};

type SavedBoard = {
  id: string;
  categoria_id: string;
  nombre: string;
  deporte?: string | null;
  contenido: BoardContent;
  updated_at: string;
};

type Tool = 'move' | 'draw' | 'arrow' | 'erase';
type Gesture =
  | { type: 'token'; id: string; before: BoardContent }
  | { type: 'draw'; id: string; before: BoardContent }
  | { type: 'arrow'; id: string; before: BoardContent };

type Props = {
  categories: Category[];
  academyName?: string;
};

const EMPTY_BOARD: BoardContent = { version: 1, tokens: [], strokes: [] };
const uid = () => globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
const cloneBoard = (value: BoardContent): BoardContent => JSON.parse(JSON.stringify(value)) as BoardContent;
const todayChile = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Santiago', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const normalizedDiscipline = (value?: string | null) => String(value || '').toLocaleLowerCase('es');

const formationFor = (discipline: string) => {
  if (discipline.includes('fút') || discipline.includes('fut')) {
    return [
      [500, 555],
      [180, 455], [390, 470], [610, 470], [820, 455],
      [280, 330], [500, 350], [720, 330],
      [230, 170], [500, 135], [770, 170],
    ];
  }
  if (discipline.includes('bás') || discipline.includes('bas') || discipline.includes('basket')) {
    return [[500, 500], [260, 390], [740, 390], [340, 205], [660, 205]];
  }
  if (discipline.includes('vól') || discipline.includes('vol') || discipline.includes('voley')) {
    return [[250, 430], [500, 430], [750, 430], [250, 230], [500, 230], [750, 230]];
  }
  if (discipline.includes('tenis')) return [[500, 455], [500, 165]];
  return [[220, 450], [500, 480], [780, 450], [300, 290], [500, 320], [700, 290], [400, 150], [600, 150]];
};

const FieldTemplate = ({ discipline }: { discipline: string }) => {
  if (discipline.includes('fút') || discipline.includes('fut')) {
    return <>
      <rect width="1000" height="620" rx="24" fill="#174d2e" />
      <rect x="28" y="28" width="944" height="564" fill="none" stroke="#d9f1dc" strokeWidth="5" />
      <line x1="28" y1="310" x2="972" y2="310" stroke="#d9f1dc" strokeWidth="4" />
      <circle cx="500" cy="310" r="82" fill="none" stroke="#d9f1dc" strokeWidth="4" />
      <circle cx="500" cy="310" r="6" fill="#d9f1dc" />
      <rect x="300" y="28" width="400" height="120" fill="none" stroke="#d9f1dc" strokeWidth="4" />
      <rect x="395" y="28" width="210" height="58" fill="none" stroke="#d9f1dc" strokeWidth="4" />
      <rect x="300" y="472" width="400" height="120" fill="none" stroke="#d9f1dc" strokeWidth="4" />
      <rect x="395" y="534" width="210" height="58" fill="none" stroke="#d9f1dc" strokeWidth="4" />
    </>;
  }
  if (discipline.includes('bás') || discipline.includes('bas') || discipline.includes('basket')) {
    return <>
      <rect width="1000" height="620" rx="24" fill="#b9793f" />
      <rect x="28" y="28" width="944" height="564" fill="none" stroke="#fff4df" strokeWidth="5" />
      <line x1="500" y1="28" x2="500" y2="592" stroke="#fff4df" strokeWidth="4" />
      <circle cx="500" cy="310" r="75" fill="none" stroke="#fff4df" strokeWidth="4" />
      <rect x="28" y="190" width="190" height="240" fill="none" stroke="#fff4df" strokeWidth="4" />
      <rect x="782" y="190" width="190" height="240" fill="none" stroke="#fff4df" strokeWidth="4" />
      <circle cx="165" cy="310" r="78" fill="none" stroke="#fff4df" strokeWidth="4" />
      <circle cx="835" cy="310" r="78" fill="none" stroke="#fff4df" strokeWidth="4" />
    </>;
  }
  if (discipline.includes('vól') || discipline.includes('vol') || discipline.includes('voley')) {
    return <>
      <rect width="1000" height="620" rx="24" fill="#bb7445" />
      <rect x="70" y="40" width="860" height="540" fill="none" stroke="#fff4df" strokeWidth="5" />
      <line x1="70" y1="310" x2="930" y2="310" stroke="#fff4df" strokeWidth="7" />
      <line x1="70" y1="205" x2="930" y2="205" stroke="#fff4df" strokeWidth="3" />
      <line x1="70" y1="415" x2="930" y2="415" stroke="#fff4df" strokeWidth="3" />
    </>;
  }
  if (discipline.includes('tenis')) {
    return <>
      <rect width="1000" height="620" rx="24" fill="#245a48" />
      <rect x="95" y="35" width="810" height="550" fill="none" stroke="#f4f7e9" strokeWidth="5" />
      <rect x="95" y="135" width="810" height="350" fill="none" stroke="#f4f7e9" strokeWidth="3" />
      <line x1="500" y1="35" x2="500" y2="585" stroke="#f4f7e9" strokeWidth="5" />
      <line x1="300" y1="135" x2="300" y2="485" stroke="#f4f7e9" strokeWidth="3" />
      <line x1="700" y1="135" x2="700" y2="485" stroke="#f4f7e9" strokeWidth="3" />
    </>;
  }
  return <>
    <rect width="1000" height="620" rx="24" fill="#15251d" />
    <rect x="30" y="30" width="940" height="560" fill="none" stroke="#d9f1dc" strokeWidth="4" strokeDasharray="12 10" />
    <line x1="500" y1="30" x2="500" y2="590" stroke="#d9f1dc" strokeWidth="3" opacity=".55" />
    <circle cx="500" cy="310" r="85" fill="none" stroke="#d9f1dc" strokeWidth="3" opacity=".55" />
  </>;
};

const ProfessorTacticalBoard = ({ categories, academyName }: Props) => {
  const { notify, confirmAction } = useAppDialog();
  const [categoryId, setCategoryId] = useState(categories[0]?.id || '');
  const [players, setPlayers] = useState<Player[]>([]);
  const [boards, setBoards] = useState<SavedBoard[]>([]);
  const [selectedBoardId, setSelectedBoardId] = useState('');
  const [name, setName] = useState('Nueva jugada');
  const [content, setContent] = useState<BoardContent>(EMPTY_BOARD);
  const [tool, setTool] = useState<Tool>('move');
  const [strokeColor, setStrokeColor] = useState('#b7ff00');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<BoardContent[]>([]);
  const [future, setFuture] = useState<BoardContent[]>([]);
  const svgRef = useRef<SVGSVGElement>(null);
  const captureRef = useRef<HTMLDivElement>(null);
  const gestureRef = useRef<Gesture | null>(null);

  const category = useMemo(() => categories.find((item) => item.id === categoryId) || categories[0], [categories, categoryId]);
  const discipline = normalizedDiscipline(category?.ramas?.disciplina || category?.ramas?.nombre || 'multideporte');

  const resetBoard = useCallback(() => {
    setSelectedBoardId('');
    setName(category ? `Pizarra · ${category.nombre}` : 'Nueva jugada');
    setContent(EMPTY_BOARD);
    setHistory([]);
    setFuture([]);
    setTool('move');
  }, [category]);

  const loadWorkspace = useCallback(async () => {
    if (!categoryId) return;
    setLoading(true);
    try {
      const [rosterResponse, boardsResponse] = await Promise.all([
        api.get(`/api/profesores/me/categorias/${categoryId}/asistencia`, { params: { fecha: todayChile() } }),
        api.get('/api/profesores/me/pizarras', { params: { categoria_id: categoryId } }),
      ]);
      setPlayers((rosterResponse.data.data.jugadores || []) as Player[]);
      setBoards((boardsResponse.data.data || []) as SavedBoard[]);
    } catch (error: any) {
      await notify(error.response?.data?.error || 'No fue posible preparar la pizarra.', { title: academyName });
    } finally {
      setLoading(false);
    }
  }, [academyName, categoryId, notify]);

  useEffect(() => { if (categoryId) void loadWorkspace(); }, [categoryId, loadWorkspace]);
  useEffect(() => { resetBoard(); }, [categoryId, resetBoard]);

  const pushHistory = (before: BoardContent) => {
    setHistory((current) => [...current.slice(-29), cloneBoard(before)]);
    setFuture([]);
  };

  const pointFromEvent = (event: ReactPointerEvent<SVGSVGElement>) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return {
      x: clamp(((event.clientX - rect.left) / rect.width) * 1000, 0, 1000),
      y: clamp(((event.clientY - rect.top) / rect.height) * 620, 0, 620),
    };
  };

  const handleBoardPointerDown = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (tool === 'move' || tool === 'erase') return;
    const point = pointFromEvent(event);
    const before = cloneBoard(content);
    const id = uid();
    svgRef.current?.setPointerCapture?.(event.pointerId);
    if (tool === 'draw') {
      setContent((current) => ({ ...current, strokes: [...current.strokes, { id, kind: 'draw', points: [point.x, point.y], color: strokeColor, width: 6 }] }));
      gestureRef.current = { type: 'draw', id, before };
    } else if (tool === 'arrow') {
      setContent((current) => ({ ...current, strokes: [...current.strokes, { id, kind: 'arrow', points: [point.x, point.y, point.x, point.y], color: strokeColor, width: 6 }] }));
      gestureRef.current = { type: 'arrow', id, before };
    }
  };

  const handleBoardPointerMove = (event: ReactPointerEvent<SVGSVGElement>) => {
    const gesture = gestureRef.current;
    if (!gesture) return;
    const point = pointFromEvent(event);
    if (gesture.type === 'token') {
      setContent((current) => ({ ...current, tokens: current.tokens.map((token) => token.id === gesture.id ? { ...token, x: clamp(point.x, 34, 966), y: clamp(point.y, 34, 586) } : token) }));
      return;
    }
    if (gesture.type === 'draw') {
      setContent((current) => ({ ...current, strokes: current.strokes.map((stroke) => stroke.id === gesture.id ? { ...stroke, points: [...stroke.points, point.x, point.y] } : stroke) }));
      return;
    }
    setContent((current) => ({ ...current, strokes: current.strokes.map((stroke) => stroke.id === gesture.id ? { ...stroke, points: [stroke.points[0], stroke.points[1], point.x, point.y] } : stroke) }));
  };

  const handleBoardPointerUp = (event: ReactPointerEvent<SVGSVGElement>) => {
    const gesture = gestureRef.current;
    if (!gesture) return;
    pushHistory(gesture.before);
    gestureRef.current = null;
    if (svgRef.current?.hasPointerCapture?.(event.pointerId)) svgRef.current.releasePointerCapture(event.pointerId);
  };

  const startTokenDrag = (event: ReactPointerEvent<SVGGElement>, tokenId: string) => {
    event.stopPropagation();
    if (tool === 'erase') {
      const before = cloneBoard(content);
      setContent((current) => ({ ...current, tokens: current.tokens.filter((token) => token.id !== tokenId) }));
      pushHistory(before);
      return;
    }
    if (tool !== 'move') return;
    gestureRef.current = { type: 'token', id: tokenId, before: cloneBoard(content) };
    svgRef.current?.setPointerCapture?.(event.pointerId);
  };

  const eraseStroke = (event: ReactPointerEvent<SVGElement>, strokeId: string) => {
    if (tool !== 'erase') return;
    event.stopPropagation();
    const before = cloneBoard(content);
    setContent((current) => ({ ...current, strokes: current.strokes.filter((stroke) => stroke.id !== strokeId) }));
    pushHistory(before);
  };

  const addToken = (token: Omit<BoardToken, 'id' | 'x' | 'y'>) => {
    const before = cloneBoard(content);
    const index = content.tokens.length;
    setContent((current) => ({
      ...current,
      tokens: [...current.tokens, { ...token, id: uid(), x: 90 + (index % 8) * 105, y: 555 - Math.floor(index / 8) * 70 }],
    }));
    pushHistory(before);
  };

  const addPlayer = (player: Player) => {
    if (content.tokens.some((token) => token.kind === 'player' && token.playerId === player.id)) return;
    addToken({ kind: 'player', playerId: player.id, label: player.nombre });
  };

  const smartArrange = () => {
    const positions = formationFor(discipline);
    const before = cloneBoard(content);
    const arrangedPlayers = players.slice(0, positions.length).map((player, index) => ({
      id: uid(), kind: 'player' as const, playerId: player.id, label: player.nombre, x: positions[index][0], y: positions[index][1],
    }));
    setContent((current) => ({ ...current, tokens: [...current.tokens.filter((token) => token.kind !== 'player'), ...arrangedPlayers] }));
    pushHistory(before);
  };

  const undo = () => {
    const previous = history[history.length - 1];
    if (!previous) return;
    setFuture((current) => [cloneBoard(content), ...current].slice(0, 30));
    setContent(cloneBoard(previous));
    setHistory((current) => current.slice(0, -1));
  };

  const redo = () => {
    const next = future[0];
    if (!next) return;
    setHistory((current) => [...current.slice(-29), cloneBoard(content)]);
    setContent(cloneBoard(next));
    setFuture((current) => current.slice(1));
  };

  const clearBoard = async () => {
    if (!content.tokens.length && !content.strokes.length) return;
    if (!(await confirmAction('Se eliminarán los jugadores, objetos y trazos de esta pizarra.', { title: 'Limpiar pizarra', confirmLabel: 'Limpiar', cancelLabel: 'Volver' }))) return;
    pushHistory(content);
    setContent(EMPTY_BOARD);
  };

  const selectBoard = (boardId: string) => {
    if (!boardId) return resetBoard();
    const board = boards.find((item) => item.id === boardId);
    if (!board) return;
    setSelectedBoardId(board.id);
    setName(board.nombre);
    setContent(board.contenido && typeof board.contenido === 'object' ? board.contenido : EMPTY_BOARD);
    setHistory([]);
    setFuture([]);
    setTool('move');
  };

  const saveBoard = async () => {
    if (!categoryId) return;
    setSaving(true);
    try {
      const payload = { categoria_id: categoryId, nombre: name.trim() || 'Nueva jugada', deporte: category?.ramas?.disciplina || '', contenido: content };
      const response = selectedBoardId
        ? await api.put(`/api/profesores/me/pizarras/${selectedBoardId}`, payload)
        : await api.post('/api/profesores/me/pizarras', payload);
      const saved = response.data.data as SavedBoard;
      setSelectedBoardId(saved.id);
      setName(saved.nombre);
      await loadWorkspace();
      await notify('✅ Pizarra guardada correctamente.', { title: academyName });
    } catch (error: any) {
      await notify(error.response?.data?.error || 'No fue posible guardar la pizarra.', { title: academyName });
    } finally {
      setSaving(false);
    }
  };

  const deleteBoard = async () => {
    if (!selectedBoardId) return;
    if (!(await confirmAction(`Se eliminará “${name}”.`, { title: 'Eliminar pizarra', confirmLabel: 'Eliminar', cancelLabel: 'Volver', tone: 'danger' }))) return;
    try {
      await api.delete(`/api/profesores/me/pizarras/${selectedBoardId}`);
      resetBoard();
      await loadWorkspace();
      await notify('Pizarra eliminada.', { title: academyName });
    } catch (error: any) {
      await notify(error.response?.data?.error || 'No fue posible eliminar la pizarra.', { title: academyName });
    }
  };

  const exportPng = async () => {
    if (!captureRef.current) return;
    try {
      const canvas = await html2canvas(captureRef.current, { scale: 2, backgroundColor: '#0d1117' });
      const link = document.createElement('a');
      link.download = `${(name || 'pizarra-lestra').replace(/[^a-z0-9-_]+/gi, '-').toLowerCase()}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch {
      await notify('No fue posible exportar la pizarra.', { title: academyName });
    }
  };

  const drawPath = (points: number[]) => {
    if (points.length < 2) return '';
    let path = `M ${points[0]} ${points[1]}`;
    for (let index = 2; index < points.length; index += 2) path += ` L ${points[index]} ${points[index + 1]}`;
    return path;
  };

  if (!categories.length) return <section className="card border-dashed p-8 text-center text-[#8b949e]">Necesitas una categoría asignada para usar la pizarra.</section>;

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[.16em] text-[#48d8d0]">Pizarra Lestra</p>
          <h2 className="mt-1 text-2xl font-black text-white">Diseña la sesión en cancha</h2>
          <p className="mt-1 max-w-2xl text-sm text-[#8b949e]">Mueve jugadores reales, dibuja recorridos y guarda jugadas por categoría. “Ordenar equipo” adapta una formación inicial a la disciplina.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={resetBoard} className="min-h-11 rounded-xl border border-[#30363d] bg-[#161b22] px-4 text-sm font-black text-[#d0d7de]">Nueva</button>
          <button type="button" onClick={() => void exportPng()} className="min-h-11 rounded-xl border border-[#30363d] bg-[#161b22] px-4 text-sm font-black text-[#d0d7de]">Exportar PNG</button>
          <button type="button" onClick={() => void saveBoard()} disabled={saving} className="min-h-11 rounded-xl bg-[#b7ff00] px-5 text-sm font-black text-[#10150f] disabled:opacity-60">{saving ? 'Guardando...' : 'Guardar pizarra'}</button>
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-[1fr_1fr_1.2fr]">
        <label><span className="label">Categoría / rama</span><select className="w-full" value={categoryId} onChange={(event) => setCategoryId(event.target.value)}>{categories.map((item) => <option key={item.id} value={item.id}>{item.ramas?.disciplina ? `${item.ramas.disciplina} · ` : ''}{item.nombre}</option>)}</select></label>
        <label><span className="label">Pizarra guardada</span><select className="w-full" value={selectedBoardId} onChange={(event) => selectBoard(event.target.value)}><option value="">Nueva pizarra</option>{boards.map((board) => <option key={board.id} value={board.id}>{board.nombre}</option>)}</select></label>
        <label><span className="label">Nombre de la jugada / ejercicio</span><input className="w-full" value={name} maxLength={120} onChange={(event) => setName(event.target.value)} placeholder="Ej.: Salida 4-3-3" /></label>
      </div>

      <div className="grid gap-4 xl:grid-cols-[250px_minmax(0,1fr)]">
        <aside className="space-y-3 rounded-2xl border border-[#30363d] bg-[#161b22] p-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[.14em] text-[#8b949e]">Herramientas</p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {([['move', 'Mover'], ['draw', 'Dibujar'], ['arrow', 'Flecha'], ['erase', 'Borrar']] as [Tool, string][]).map(([value, label]) => <button key={value} type="button" onClick={() => setTool(value)} className={`min-h-10 rounded-xl px-2 text-xs font-black ${tool === value ? 'bg-[#289E9D] text-white' : 'border border-[#30363d] bg-[#0d1117] text-[#b1bac4]'}`}>{label}</button>)}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={undo} disabled={!history.length} className="min-h-10 rounded-xl border border-[#30363d] text-xs font-black text-[#b1bac4] disabled:opacity-40">↶ Deshacer</button>
            <button type="button" onClick={redo} disabled={!future.length} className="min-h-10 rounded-xl border border-[#30363d] text-xs font-black text-[#b1bac4] disabled:opacity-40">↷ Rehacer</button>
          </div>

          <label className="block"><span className="text-[10px] font-black uppercase tracking-[.14em] text-[#8b949e]">Color de trazo</span><div className="mt-2 flex gap-2">{['#b7ff00', '#ffffff', '#ff5555', '#54c8ff'].map((color) => <button key={color} type="button" aria-label={`Color ${color}`} onClick={() => setStrokeColor(color)} className={`h-9 w-9 rounded-full border-2 ${strokeColor === color ? 'border-white' : 'border-transparent'}`} style={{ backgroundColor: color }} />)}</div></label>

          <button type="button" onClick={smartArrange} className="min-h-11 w-full rounded-xl border border-[#b7ff00]/50 bg-[#b7ff00]/10 px-3 text-sm font-black text-[#d8ff6a]">✨ Ordenar equipo</button>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => addToken({ kind: 'ball', label: 'Balón' })} className="min-h-10 rounded-xl border border-[#30363d] text-xs font-black text-[#d0d7de]">● Balón</button>
            <button type="button" onClick={() => addToken({ kind: 'cone', label: 'Cono' })} className="min-h-10 rounded-xl border border-[#30363d] text-xs font-black text-[#d0d7de]">▲ Cono</button>
          </div>
          <button type="button" onClick={() => void clearBoard()} className="min-h-10 w-full rounded-xl border border-red-500/30 bg-red-500/5 text-xs font-black text-red-300">Limpiar pizarra</button>
          {selectedBoardId ? <button type="button" onClick={() => void deleteBoard()} className="min-h-10 w-full rounded-xl border border-red-500/30 text-xs font-black text-red-300">Eliminar guardada</button> : null}

          <div className="border-t border-[#30363d] pt-3">
            <p className="text-[10px] font-black uppercase tracking-[.14em] text-[#8b949e]">Jugadores</p>
            {loading ? <p className="mt-2 text-xs text-[#8b949e]">Cargando plantel...</p> : null}
            <div className="mt-2 max-h-64 space-y-1 overflow-auto pr-1">
              {players.map((player) => {
                const used = content.tokens.some((token) => token.kind === 'player' && token.playerId === player.id);
                return <button key={player.id} type="button" disabled={used} onClick={() => addPlayer(player)} className="flex min-h-9 w-full items-center justify-between rounded-lg border border-[#30363d] px-2 text-left text-xs font-bold text-[#d0d7de] disabled:opacity-35"><span className="truncate">{player.nombre}</span><span>{used ? '✓' : '+'}</span></button>;
              })}
            </div>
          </div>
        </aside>

        <div className="min-w-0">
          <div ref={captureRef} className="overflow-hidden rounded-3xl border border-[#30363d] bg-[#0d1117] p-2 shadow-2xl">
            <svg
              ref={svgRef}
              viewBox="0 0 1000 620"
              className="block aspect-[1000/620] w-full touch-none select-none rounded-[20px]"
              onPointerDown={handleBoardPointerDown}
              onPointerMove={handleBoardPointerMove}
              onPointerUp={handleBoardPointerUp}
              onPointerCancel={handleBoardPointerUp}
            >
              <defs>
                <marker id="lestra-board-arrow" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto" markerUnits="strokeWidth"><path d="M0,0 L0,6 L9,3 z" fill="context-stroke" /></marker>
              </defs>
              <FieldTemplate discipline={discipline} />
              {content.strokes.map((stroke) => stroke.kind === 'draw' ? (
                <path key={stroke.id} d={drawPath(stroke.points)} fill="none" stroke={stroke.color} strokeWidth={stroke.width} strokeLinecap="round" strokeLinejoin="round" opacity=".95" onPointerDown={(event) => eraseStroke(event, stroke.id)} style={{ cursor: tool === 'erase' ? 'crosshair' : 'default' }} />
              ) : (
                <line key={stroke.id} x1={stroke.points[0]} y1={stroke.points[1]} x2={stroke.points[2]} y2={stroke.points[3]} stroke={stroke.color} strokeWidth={stroke.width} strokeLinecap="round" markerEnd="url(#lestra-board-arrow)" onPointerDown={(event) => eraseStroke(event, stroke.id)} style={{ cursor: tool === 'erase' ? 'crosshair' : 'default' }} />
              ))}
              {content.tokens.map((token) => (
                <g key={token.id} transform={`translate(${token.x} ${token.y})`} onPointerDown={(event) => startTokenDrag(event, token.id)} style={{ cursor: tool === 'move' ? 'grab' : tool === 'erase' ? 'crosshair' : 'default' }}>
                  {token.kind === 'player' ? <>
                    <circle r="31" fill="#10150f" stroke="#b7ff00" strokeWidth="4" />
                    <text textAnchor="middle" y="5" fill="#ffffff" fontSize="21" fontWeight="900">{token.label.split(' ')[0].slice(0, 8)}</text>
                    <rect x="-52" y="36" width="104" height="24" rx="12" fill="#10150f" opacity=".9" />
                    <text textAnchor="middle" y="53" fill="#d9e1da" fontSize="13" fontWeight="700">{token.label.slice(0, 15)}</text>
                  </> : token.kind === 'ball' ? <>
                    <circle r="24" fill="#ffffff" stroke="#111711" strokeWidth="4" />
                    <circle r="7" fill="#111711" />
                  </> : <path d="M 0 -28 L 25 24 L -25 24 Z" fill="#ff9d3d" stroke="#fff4df" strokeWidth="3" />}
                </g>
              ))}
            </svg>
          </div>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-[#697586]"><span>{category?.ramas?.disciplina || 'Multideporte'} · {content.tokens.filter((token) => token.kind === 'player').length} jugadores · {content.strokes.length} trazos</span><span>{tool === 'move' ? 'Arrastra las fichas para posicionarlas.' : tool === 'draw' ? 'Dibuja manteniendo presionado.' : tool === 'arrow' ? 'Arrastra desde origen a destino.' : 'Toca una ficha o trazo para borrarlo.'}</span></div>
        </div>
      </div>
    </section>
  );
};

export default ProfessorTacticalBoard;
