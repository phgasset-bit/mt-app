"""Genera los modelos humanos del juego esculpiendo campos de distancia (SDF) y extrayendo la superficie.

Cada pieza (cuerpo, cabeza, tocado) se define como unión suave de primitivas anatómicas: pelvis, caja torácica,
pectorales, dorsales, trapecios, deltoides, bíceps, tríceps, antebrazos, manos, cuádriceps, gemelos; cráneo,
mandíbula, pómulos, nariz, cuencas, ojos, labios y orejas. La ropa se añade como volumen (camisa remangada,
pantalón con pliegues, polainas, botas, correaje). La superficie se obtiene con marching cubes, se simplifica
a dos niveles de detalle y se le asignan materiales y pesos de piel para un esqueleto de 17 huesos.

Salida: www/modelos/humanos.json (manifiesto) y www/modelos/humanos.bin (datos binarios).
Uso: python3 tools/gen_humanos.py
"""
import json, os, struct, time
import numpy as np
from skimage.measure import marching_cubes
import fast_simplification

AQUI = os.path.dirname(os.path.abspath(__file__))
SALIDA = os.path.join(AQUI, '..', 'www', 'modelos')
V = lambda *a: np.array(a, dtype=np.float64)

# ---------------- primitivas ----------------
def L(v): return np.sqrt(np.sum(v * v, axis=-1))
def esf(P, c, r): return L(P - c) - r
def eli(P, c, r):
    r = np.asarray(r, dtype=np.float64); q = (P - c) / r; k0 = L(q); k1 = L(q / r)
    return k0 * (k0 - 1) / np.maximum(k1, 1e-9)
def cap(P, a, b, ra, rb=None):
    rb = ra if rb is None else rb
    pa = P - a; ba = b - a; h = np.clip(pa @ ba / (ba @ ba), 0, 1)
    return L(pa - h[:, None] * ba) - (ra + (rb - ra) * h)
def caja(P, c, s, r):
    q = np.abs(P - c) - np.asarray(s); return L(np.maximum(q, 0)) + np.minimum(np.max(q, axis=-1), 0) - r
def toro(P, c, R, r, inc=0.0):
    p = P - c
    if inc:
        cy, sy = np.cos(inc), np.sin(inc); p = np.stack([p[:, 0], p[:, 1] * cy - p[:, 2] * sy, p[:, 1] * sy + p[:, 2] * cy], -1)
    q = np.stack([np.sqrt(p[:, 0] ** 2 + p[:, 2] ** 2) - R, p[:, 1]], -1); return L(q) - r
def smin(a, b, k):
    h = np.clip(0.5 + 0.5 * (b - a) / k, 0, 1); return b * (1 - h) + a * h - k * h * (1 - h)
def smax(a, b, k): return -smin(-a, -b, k)
def sig(x): return 1 / (1 + np.exp(-np.clip(x, -40, 40)))
def banda(x, a, b, s=0.004):  # 1 dentro de [a,b] con bordes suaves
    return 1 / (1 + np.exp(-(x - a) / s)) * (1 / (1 + np.exp((x - b) / s)))

# ---------------- esqueleto ----------------
HD = 0.17  # largo de la mano
def juntas():
    J = {'cadera': V(0, 0.95, 0), 'columna': V(0, 1.08, 0), 'pecho': V(0, 1.30, 0), 'cuello': V(0, 1.50, 0.01), 'cabeza': V(0, 1.62, 0)}
    for s, l in ((-1, 'I'), (1, 'D')):
        J['hombro' + l] = V(s * 0.2, 1.45, 0); J['codo' + l] = V(s * 0.29, 1.174, -0.01); J['muneca' + l] = V(s * 0.344, 0.925, -0.03)
        J['cadera' + l] = V(s * 0.095, 0.93, 0); J['rodilla' + l] = V(s * 0.1, 0.5, -0.012); J['tobillo' + l] = V(s * 0.1, 0.085, 0.015)
    return J
J = juntas()
H = V(0, 1.67, 0)  # centro de la cabeza
HUESOS = [  # nombre, padre, origen, final (para los pesos)
    ('cadera', -1, J['cadera'], J['columna']), ('columna', 0, J['columna'], J['pecho']), ('pecho', 1, J['pecho'], J['cuello']),
    ('cuello', 2, J['cuello'], J['cabeza']), ('cabeza', 3, J['cabeza'], V(0, 1.79, 0)),
]
for l in 'ID':
    d = J['muneca' + l] - J['codo' + l]; d /= np.linalg.norm(d)
    HUESOS += [('brazo' + l, 2, J['hombro' + l], J['codo' + l]), ('antebrazo' + l, len(HUESOS), J['codo' + l], J['muneca' + l]),
               ('mano' + l, len(HUESOS) + 1, J['muneca' + l], J['muneca' + l] + d * HD)]
for l in 'ID':
    s = -1 if l == 'I' else 1
    HUESOS += [('muslo' + l, 0, J['cadera' + l], J['rodilla' + l]), ('pierna' + l, len(HUESOS), J['rodilla' + l], J['tobillo' + l]),
               ('pie' + l, len(HUESOS) + 1, J['tobillo' + l], V(s * 0.1, 0.04, -0.14))]
IDX = {h[0]: i for i, h in enumerate(HUESOS)}

# ---------------- cuerpo ----------------
def grupos_cuerpo(P, m):
    """Distancias por grupo anatómico: tronco, brazos, manos, piernas."""
    t = eli(P, V(0, 0.95, 0), (0.165, 0.12, 0.11))
    t = smin(t, eli(P, V(0, 1.08, 0.005), (0.142 - 0.004 * m, 0.12, 0.098)), 0.04)
    t = smin(t, eli(P, V(0, 1.285, 0.0), (0.162 + 0.012 * m, 0.17, 0.112 + 0.004 * m)), 0.05)
    t = smin(t, eli(P, V(0, 1.16, -0.07), (0.1, 0.1, 0.035)), 0.04)
    for s in (-1, 1):
        t = smin(t, eli(P, V(s * 0.072, 1.335, -0.072), (0.075 + 0.01 * m, 0.058 + 0.006 * m, 0.034 + 0.012 * m)), 0.03)
        t = smin(t, eli(P, V(s * 0.122, 1.25, 0.03), (0.055 + 0.018 * m, 0.13, 0.065)), 0.04)
        t = smin(t, cap(P, V(s * 0.03, 1.53, 0.025), V(s * 0.16, 1.48, 0.02), 0.038 + 0.012 * m), 0.03)
        t = smin(t, eli(P, V(s * 0.2, 1.43, 0.0), (0.066 + 0.012 * m, 0.074 + 0.01 * m, 0.07 + 0.01 * m)), 0.03)
    t = smin(t, cap(P, V(0, 1.46, 0.01), V(0, 1.6, 0.0), 0.058 + 0.01 * m, 0.052 + 0.006 * m), 0.03)
    brazos, manos, piernas = [], [], []
    for s, l in ((-1, 'I'), (1, 'D')):
        sh, el, wr = J['hombro' + l], J['codo' + l], J['muneca' + l]
        d = el - sh; ua = cap(P, sh, el, 0.05 + 0.008 * m, 0.04 + 0.004 * m)
        bic = cap(P, sh + 0.3 * d + V(0, 0, -0.022), sh + 0.72 * d + V(0, 0, -0.02), 0.034 + 0.013 * m)
        tri = cap(P, sh + 0.25 * d + V(0, 0, 0.02), sh + 0.7 * d + V(0, 0, 0.02), 0.034 + 0.01 * m)
        ua = smin(ua, smin(bic, tri, 0.02), 0.02)
        fd = wr - el; fa = cap(P, el, wr, 0.042 + 0.007 * m, 0.029 + 0.002 * m)
        fa = smin(fa, cap(P, el + 0.08 * fd + V(0, 0, -0.004), el + 0.5 * fd, 0.044 + 0.01 * m, 0.035 + 0.005 * m), 0.02)
        brazos.append(smin(ua, fa, 0.02))
        hd = fd / np.linalg.norm(fd)
        palma = eli(P, wr + 0.055 * hd, (0.019, 0.05, 0.043))
        dedos = eli(P, wr + 0.13 * hd + V(0, 0, -0.008), (0.016, 0.05, 0.04))
        pulgar = cap(P, wr + 0.03 * hd + V(-s * 0.005, 0, -0.03), wr + 0.085 * hd + V(-s * 0.012, 0, -0.05), 0.012, 0.01)
        manos.append(smin(smin(palma, dedos, 0.012), pulgar, 0.01))
        hip, kn, an = J['cadera' + l], J['rodilla' + l], J['tobillo' + l]
        k = kn - hip; th = cap(P, hip, kn, 0.092 + 0.01 * m, 0.058 + 0.004 * m)
        th = smin(th, cap(P, hip + 0.25 * k + V(0, 0, -0.03), hip + 0.85 * k + V(0, 0, -0.022), 0.055 + 0.01 * m, 0.045), 0.03)
        a = an - kn; sn = cap(P, kn, an, 0.052, 0.034)
        sn = smin(sn, cap(P, kn + 0.15 * a + V(0, 0, 0.03), kn + 0.55 * a + V(0, 0, 0.02), 0.048 + 0.007 * m, 0.034), 0.03)
        pie = cap(P, V(s * 0.1, 0.045, 0.05), V(s * 0.1, 0.04, -0.13), 0.045, 0.038)
        piernas.append(smin(smin(th, sn, 0.03), pie, 0.03))
    return t, brazos, manos, piernas

def correaje(P):
    g = caja(P, V(0, 1.035, -0.13), (0.012, 0.022, 0.006), 0.004)  # hebilla
    hebilla = g
    for s in (-1, 1): g = np.minimum(g, caja(P, V(s * 0.085, 1.035, -0.128), (0.04, 0.03, 0.022), 0.008))  # cartucheras
    g = np.minimum(g, cap(P, V(-0.13, 1.47, -0.097), V(0.12, 1.07, -0.137), 0.016))   # tirante delante
    g = np.minimum(g, cap(P, V(-0.13, 1.47, 0.092), V(0.12, 1.07, 0.112), 0.016))       # tirante detrás
    g = np.minimum(g, eli(P, V(0.15, 1.0, 0.07), (0.035, 0.07, 0.05)))                  # cantimplora
    return g, hebilla

def ropa(P, t, brazos, manos, piernas):
    """Volumen de la ropa y material de cada punto."""
    y = P[:, 1]; n = len(P)
    infl = np.zeros(n); mat = np.zeros(n, dtype=np.uint8)
    dA = np.minimum(brazos[0], brazos[1]); dM = np.minimum(manos[0], manos[1]); dL = np.minimum(piernas[0], piernas[1])
    grupo = np.argmin(np.stack([t, dA, dM, dL]), axis=0)
    pliegue = 0.0028 * np.sin(17 * y + 6 * P[:, 0]) * np.sin(13 * P[:, 2] + 9 * y + 3 * P[:, 0])
    # tronco
    tr = grupo == 0
    cam = banda(y, 1.065, 1.56, 0.006); cin = banda(y, 0.995, 1.065, 0.004); pan = 1 - banda(y, 0.995, 3, 0.004)
    escote_w = sig((y - 1.39) / 0.006) * sig(((y - 1.39) * 0.55 + 0.01 - np.abs(P[:, 0])) / 0.006) * sig((-0.04 - P[:, 2]) / 0.01)
    escote = escote_w > 0.5
    rc = np.sqrt(P[:, 0] ** 2 + (P[:, 2] - 0.01) ** 2)
    cuello_w = sig((y - 1.49) / 0.006) * sig((0.078 - rc) / 0.006)
    escote_w = np.maximum(escote_w, cuello_w)
    cuello = cuello_w > 0.5
    v = cam * (0.012 + pliegue) * (1 - escote_w) + cin * 0.024 + pan * (0.02 + pliegue)
    infl[tr] = v[tr]
    mt = np.where(cuello, 0, np.where(y > 1.065, 1, np.where(y > 0.995, 3, 2)))
    mat[tr] = mt[tr]
    mez = np.ones(n); camisa_tr = tr & (y > 1.065) & ~cuello
    mez[camisa_tr] = (1 - escote_w)[camisa_tr]
    # brazos: camisa remangada por encima del codo
    for i, l in enumerate('ID'):
        sh, el = J['hombro' + l], J['codo' + l]; d = el - sh
        h = np.clip((P - sh) @ d / (d @ d), 0, 1.6)
        sel = (grupo == 1) & (brazos[i] <= brazos[1 - i])
        manga = (h < 0.72); vuelta = (h >= 0.72) & (h < 0.86)
        vv = (0.012 + pliegue) * sig((0.72 - h) / 0.015) + 0.02 * banda(h, 0.72, 0.86, 0.008)
        infl[sel] = vv[sel]
        mat[sel] = 1; mez[sel] = sig((0.86 - h) / 0.01)[sel]
    mat[grupo == 2] = 0
    # piernas: pantalón bombacho, polainas y botas
    pi = grupo == 3
    bombacho = 0.016 * np.exp(-((y - 0.44) / 0.06) ** 2)
    v = 0.01 * (1 - sig((y - 0.13) / 0.003)) + 0.013 * banda(y, 0.13, 0.37, 0.003) + (0.02 + pliegue + bombacho) * sig((y - 0.37) / 0.003)
    infl[pi] = v[pi]
    mt = np.where(y < 0.13, 4, np.where(y < 0.37, 5, 2)); mat[pi] = mt[pi]
    return infl, mat, mez

def cuerpo_legionario(m):
    def f(P, con_mat=False):
        t, br, ma, pi = grupos_cuerpo(P, m)
        cuerpo = smin(t, np.minimum(br[0], br[1]), 0.025)
        cuerpo = smin(cuerpo, np.minimum(ma[0], ma[1]), 0.012)
        cuerpo = smin(cuerpo, np.minimum(pi[0], pi[1]), 0.03)
        infl, mat, mez = ropa(P, t, br, ma, pi)
        d = cuerpo - infl
        g, hebilla = correaje(P)
        d = np.minimum(d, g)
        if not con_mat: return d
        mat[g < 0.005] = 3; mat[hebilla < 0.003] = 10; mez[g < 0.005] = 1
        return d, mat, mez
    return f

def cuerpo_moro(variante):
    """Combatiente marroquí: 'chilaba' (chilaba larga con canana) o 'faja' (túnica corta, chaleco, faja y zaragüelles)."""
    def f(P, con_mat=False):
        y = P[:, 1]
        t, br, ma, pi = grupos_cuerpo(P, 0.4)
        cuerpo = smin(t, np.minimum(br[0], br[1]), 0.025)
        cuerpo = smin(cuerpo, np.minimum(ma[0], ma[1]), 0.012)
        cuerpo = smin(cuerpo, np.minimum(pi[0], pi[1]), 0.03)
        PE = P * np.array([1.0, 1.0, 1.3])          # túnicas algo planas, siguen la forma del cuerpo
        ang = np.arctan2(P[:, 0], P[:, 2] + 1e-6)
        pli = 0.004 * np.sin(11 * ang + 4 * y) + 0.002 * np.sin(23 * ang - 7 * y)
        mangas = np.minimum(cap(P, J['hombroI'], J['munecaI'] + V(0.012, 0.045, 0), 0.068, 0.078), cap(P, J['hombroD'], J['munecaD'] + V(-0.012, 0.045, 0), 0.068, 0.078))
        canana = np.minimum(cap(P, V(-0.15, 1.47, -0.1), V(0.14, 1.03, -0.17), 0.014), cap(P, V(-0.15, 1.47, 0.09), V(0.14, 1.03, 0.12), 0.014))
        bolsa = caja(P, V(0.16, 0.98, -0.05), (0.035, 0.045, 0.02), 0.01)
        cuello = cap(P, V(0, 1.47, 0.01), V(0, 1.57, 0.005), 0.052)
        if variante == 'chilaba':
            tunica = cap(PE, V(0, 1.42, 0.006), V(0, 0.11, 0.0), 0.2, 0.32)
            tunica = smax(tunica, -(y - 0.1), 0.01)
            ropa = smin(tunica - pli * banda(y, 0.1, 1.35, 0.05), mangas, 0.015)
            faja = None; zaraguelles = None; chaleco = None
        else:
            tunica = cap(PE, V(0, 1.42, 0.006), V(0, 0.5, 0.0), 0.2, 0.26)
            tunica = smax(tunica, -(y - 0.48), 0.008)
            ropa = smin(tunica - pli * banda(y, 0.48, 1.35, 0.04), mangas, 0.015)
            zaraguelles = np.minimum(pi[0], pi[1]) - (0.028 + 0.012 * np.exp(-((y - 0.32) / 0.12) ** 2) + 0.003 * np.sin(30 * y + 9 * P[:, 0]))
            zaraguelles = smax(zaraguelles, -(y - 0.14), 0.006)
            ropa = np.minimum(ropa, zaraguelles)
            # faja y chaleco: capas que siguen la túnica, algo más gruesas para que se vean por encima
            faja = smax(tunica - 0.013, np.abs(y - 1.02) - 0.04, 0.004)
            ropa = np.minimum(ropa, faja)
            chaleco = tunica - 0.011
            chaleco = smax(chaleco, -(y - 1.07), 0.006)
            chaleco = smax(chaleco, (y - 1.47), 0.006)
            chaleco = smax(chaleco, -caja(P, V(0, 1.3, -0.2), (0.045, 0.3, 0.1), 0.01), 0.004)   # abierto por delante
            chaleco = smax(chaleco, -np.minimum(esf(P, V(-0.22, 1.36, 0.0), 0.085), esf(P, V(0.22, 1.36, 0.0), 0.085)), 0.006)  # sisas para los brazos
            ropa = np.minimum(ropa, chaleco)
        d = np.minimum(np.minimum(cuerpo, ropa), np.minimum(canana, bolsa))
        d = np.minimum(d, cuello)
        if not con_mat: return d
        mat = np.full(len(P), 15, dtype=np.uint8)
        mat[(ma[0] < 0.004) | (ma[1] < 0.004)] = 0
        mat[(cuello < 0.003) & (y > 1.47)] = 0
        if zaraguelles is not None:
            mat[(zaraguelles < 0.004) & (y < 0.5)] = 17
            mat[(chaleco < 0.004) & (y > 1.06)] = 18
            mat[faja < 0.004] = 19
        mat[(y < 0.13) & (np.minimum(pi[0], pi[1]) < 0.02)] = 4          # babuchas / sandalias
        mat[(y >= 0.13) & (y < 0.16) & (np.minimum(pi[0], pi[1]) < 0.012)] = 0  # tobillo
        mat[(canana < 0.004) | (bolsa < 0.004)] = 3
        return d, mat, np.ones(len(P))
    return f

# ---------------- cabeza ----------------
def cabeza(barba, turbante=False, m=1.0, tocado=None, escala_nariz=1.0):
    if tocado: turbante = True
    E = [H + V(s * 0.032, 0.006, -0.082) for s in (-1, 1)]
    def labios(P): return smin(cap(P, H + V(-0.021, -0.048, -0.096), H + V(0.021, -0.048, -0.096), 0.0062), cap(P, H + V(-0.018, -0.0555, -0.0945), H + V(0.018, -0.0555, -0.0945), 0.0072), 0.003)
    def cejas(P): return np.minimum(cap(P, H + V(-0.052, 0.03, -0.088), H + V(-0.016, 0.034, -0.097), 0.0048), cap(P, H + V(0.052, 0.03, -0.088), H + V(0.016, 0.034, -0.097), 0.0048))
    def bigote(P): return smin(cap(P, H + V(-0.03, -0.043, -0.1), H + V(0, -0.038, -0.107), 0.0072, 0.006), cap(P, H + V(0.03, -0.043, -0.1), H + V(0, -0.038, -0.107), 0.0072, 0.006), 0.004)
    def f(P, con_mat=False):
        r = P - H
        d = eli(P, H + V(0, 0.025, 0.012), (0.077, 0.088, 0.097))
        d = smin(d, eli(P, H + V(0, -0.02, -0.03), (0.068, 0.085, 0.075)), 0.02)
        d = smin(d, eli(P, H + V(0, -0.065, -0.03), (0.06 + 0.006 * m, 0.04, 0.065)), 0.02)
        d = smin(d, esf(P, H + V(0, -0.092, -0.083), 0.022), 0.015)
        for s in (-1, 1):
            d = smin(d, esf(P, H + V(s * 0.045, 0.0, -0.06), 0.022), 0.015)
            oreja = smax(eli(P, H + V(s * 0.078, 0.0, 0.012), (0.012, 0.03, 0.02)), -esf(P, H + V(s * 0.088, 0.0, 0.01), 0.009), 0.003)
            d = smin(d, oreja, 0.006)
        d = smin(d, cap(P, H + V(-0.04, 0.03, -0.086), H + V(0.04, 0.03, -0.086), 0.013), 0.012)
        k = escala_nariz
        nariz = smin(cap(P, H + V(0, 0.02, -0.094), H + V(0, -0.025 * k, -0.112 - 0.006 * (k - 1)), 0.009, 0.012 * k), np.minimum(esf(P, H + V(-0.013, -0.028, -0.1), 0.011), esf(P, H + V(0.013, -0.028, -0.1), 0.011)), 0.006)
        d = smin(d, nariz, 0.008)
        for e in E: d = smax(d, -esf(P, e + V(0, 0.002, -0.012), 0.0152), 0.005)
        for e in E:  # párpados: dejan el ojo en forma de almendra
            d = smin(d, cap(P, e + V(-0.012, 0.0058, -0.0088), e + V(0.012, 0.0058, -0.0088), 0.0042), 0.005)
            d = smin(d, cap(P, e + V(-0.01, -0.0068, -0.009), e + V(0.01, -0.0068, -0.009), 0.0028), 0.005)
        d = smin(d, labios(P), 0.004)
        d = smin(d, cap(P, H + V(0, -0.07, 0.01), H + V(0, -0.2, 0.015), 0.054 + 0.008 * m, 0.056 + 0.008 * m), 0.025)
        piel = d.copy()
        # pelo corto militar
        linea = 0.065 + (r[:, 2] + 0.1) / 0.2 * (-0.135)
        pelo = (r[:, 1] > linea) & ~((np.abs(r[:, 0]) > 0.07) & (r[:, 1] < 0.03) & (np.abs(r[:, 2] - 0.01) < 0.025))
        patilla = (np.abs(r[:, 0]) > 0.06) & (r[:, 2] > -0.035) & (r[:, 2] < 0.0) & (r[:, 1] > -0.02) & (r[:, 1] < 0.04)
        pelo |= patilla
        pelo_w = sig((r[:, 1] - linea) / 0.004) * (1 - sig((np.abs(r[:, 0]) - 0.07) / 0.004) * sig((0.03 - r[:, 1]) / 0.004) * sig((0.025 - np.abs(r[:, 2] - 0.01)) / 0.004))
        pelo_w = np.maximum(pelo_w, patilla * 0.6)
        if not turbante: d = d - 0.0035 * pelo_w
        # barba
        zona = (r[:, 1] < -0.012 + 0.6 * np.maximum(0, np.abs(r[:, 0]) - 0.03)) & (r[:, 2] < 0.045) & (r[:, 1] > -0.14) & (labios(P) > 0.005) & (nariz > 0.004)
        zona &= ~((np.abs(r[:, 0]) < 0.06) & (r[:, 1] > -0.03) & (r[:, 2] > -0.06))  # sin pelo en las mejillas altas
        zona_w = (sig((-0.022 + 0.5 * np.maximum(0, np.abs(r[:, 0]) - 0.045) - r[:, 1]) / 0.004) * sig((0.045 - r[:, 2]) / 0.006) * sig((r[:, 1] + 0.14) / 0.006)
                  * sig((labios(P) - 0.005) / 0.0015) * sig((nariz - 0.004) / 0.0015)
                  * (1 - sig((0.062 - np.abs(r[:, 0])) / 0.004) * sig((r[:, 1] + 0.032) / 0.004)))
        textura = 0.0012 * np.sin(140 * P[:, 0] + 40 * P[:, 1]) * np.sin(160 * P[:, 1]) * np.sin(120 * P[:, 2] + 50 * P[:, 0])
        if barba == 'corta': d = d - zona_w * sig((r[:, 1] + 0.126) / 0.004) * (0.0068 + textura * 0.5)
        if barba == 'gastador':
            d = d - zona_w * (0.012 + textura)
            d = smin(d, eli(P, H + V(0, -0.115, -0.068), (0.05, 0.055, 0.04)) - textura, 0.02)
        if barba in ('bigote', 'gastador', 'corta'): d = np.minimum(d, bigote(P))
        d = np.minimum(d, cejas(P))
        tur = None
        tur = None; capu = None
        if turbante and tocado in (None, 'turbante'):
            # turbante de varias vueltas con la cola colgando a un lado
            tur = toro(P, H + V(0, 0.048, 0.006), 0.09, 0.022, 0.18)
            tur = smin(tur, toro(P, H + V(0.004, 0.075, 0.0), 0.084, 0.023, -0.14), 0.008)
            tur = smin(tur, toro(P, H + V(-0.003, 0.1, 0.004), 0.07, 0.022, 0.1), 0.008)
            tur = smin(tur, eli(P, H + V(0, 0.112, 0.004), (0.068, 0.035, 0.078)), 0.012)
            tur = smin(tur, cap(P, H + V(0.085, 0.05, 0.04), H + V(0.1, -0.12, 0.07), 0.016, 0.012), 0.01)
            tur = tur - 0.0015 * np.sin(160 * (P[:, 1] + 0.3 * P[:, 0]))
            d = np.minimum(d, tur)
        if tocado == 'gorro':
            tur = smax(eli(P, H + V(0, 0.07, 0.008), (0.084, 0.06, 0.1)), -(P[:, 1] - (H[1] + 0.05)), 0.006)
            d = np.minimum(d, tur)
        if tocado == 'capucha':
            # capucha de la chilaba alzada: cubre cabeza y cuello, cara descubierta, punta atrás
            ext = smin(eli(P, H + V(0, 0.02, 0.012), (0.118, 0.13, 0.122)), cap(P, H + V(0, 0.09, 0.07), H + V(0, 0.16, 0.13), 0.04, 0.008), 0.03)
            ext = smin(ext, cap(P, H + V(0, -0.06, 0.02), H + V(0, -0.2, 0.03), 0.11, 0.13), 0.04)
            hueco = eli(P, H + V(0, -0.012, -0.12), (0.078, 0.1, 0.07))
            capu = smax(ext, -hueco, 0.008)
            capu = smax(capu, -(P[:, 1] - (H[1] - 0.205)), 0.004)
            d = np.minimum(d, capu)
        if not con_mat: return d
        mat = np.zeros(len(P), dtype=np.uint8); mez = np.ones(len(P))
        # pesos de color con transiciones más anchas que los triángulos (pelo y barba se difuminan en la piel)
        pelo_c = sig((r[:, 1] - linea) / 0.009) * (1 - sig((np.abs(r[:, 0]) - 0.07) / 0.006) * sig((0.03 - r[:, 1]) / 0.006) * sig((0.025 - np.abs(r[:, 2] - 0.01)) / 0.006))
        pelo_c = np.maximum(pelo_c, patilla * 0.7)
        zona_c = (sig((-0.022 + 0.5 * np.maximum(0, np.abs(r[:, 0]) - 0.045) - r[:, 1]) / 0.008) * sig((0.045 - r[:, 2]) / 0.008) * sig((r[:, 1] + 0.14) / 0.008)
                  * sig((labios(P) - 0.004) / 0.002) * sig((nariz - 0.003) / 0.002)
                  * (1 - sig((0.062 - np.abs(r[:, 0])) / 0.007) * sig((r[:, 1] + 0.032) / 0.007)))
        pw = np.zeros(len(P))
        if not turbante: pw = np.maximum(pw, pelo_c)
        if barba == 'corta': pw = np.maximum(pw, zona_c * sig((r[:, 1] + 0.126) / 0.006))
        if barba == 'gastador': pw = np.maximum(pw, np.maximum(zona_c, sig((0.004 - eli(P, H + V(0, -0.115, -0.068), (0.05, 0.055, 0.04))) / 0.003)))
        if barba != 'ninguna': pw = np.maximum(pw, sig((0.0018 - bigote(P)) / 0.0018))
        pw = np.maximum(pw, 0.9 * sig((0.0018 - cejas(P)) / 0.0018))
        lw = sig((0.0015 - labios(P)) / 0.0018) * (1 - pw)
        mat[pw > 0.02] = 6; mez[pw > 0.02] = pw[pw > 0.02]
        sel = (lw > 0.02) & (pw <= 0.02); mat[sel] = 7; mez[sel] = lw[sel] * 0.75
        if tur is not None: mat[tur < 0.003] = 14; mez[tur < 0.003] = 1
        if capu is not None: mat[capu < 0.003] = 15; mez[capu < 0.003] = 1
        return d, mat, mez
    return f

def gorrillo(P, con_mat=False):
    """Gorrillo legionario: gorro de dos picos, ladeado a la derecha, con vivo rojo en la cresta y borla colgando delante."""
    a = -0.13                                  # inclinación: la copa se va hacia la derecha (+x)
    c = H + V(0.012, 0.0, 0.004); p = P - c; ca, sa = np.cos(a), np.sin(a)
    x = p[:, 0] * ca + p[:, 1] * sa; y = -p[:, 0] * sa + p[:, 1] * ca; z = p[:, 2] - 0.004
    rim = 0.074 - 0.4 * z ** 2                 # el borde sigue la curva del cráneo
    top = 0.132 + 1.7 * z ** 2                 # la cresta se hunde en el centro y sube en los picos
    d1 = np.abs(x) - (0.079 - 0.95 * np.maximum(0, y - rim) ** 1.1 * 1.1)  # costados en cuña hasta la cresta
    d2 = y - top; d3 = rim - y
    d4 = np.abs(z) - (0.122 + 0.3 * (y - rim))   # los picos se adelantan y retrasan al subir
    d = smax(smax(d1, d2, 0.005), smax(d3, d4, 0.006), 0.004)
    PL = np.stack([x, y, z], -1)
    # borla roja colgando del pico delantero hasta la frente
    def glob(lx, ly, lz): return c + V(lx * ca - ly * sa, lx * sa + ly * ca, lz + 0.004)
    pico = glob(0, 0.132 + 1.7 * 0.14 ** 2 - 0.006, -0.14)
    cordon = cap(P, pico, H + V(0.004, 0.072, -0.124), 0.0018)
    borla = smin(eli(P, H + V(0.004, 0.06, -0.126), (0.011, 0.016, 0.011)), cap(P, H + V(0.004, 0.06, -0.126), H + V(0.004, 0.036, -0.124), 0.012, 0.016), 0.006)
    flecos = 0.0012 * np.sin(np.arctan2(P[:, 0] - H[0] - 0.004, P[:, 2] - H[2] + 0.126) * 14)
    borla = smax(borla - flecos, -(P[:, 1] - (H[1] + 0.03)), 0.002)
    d = np.minimum(d, np.minimum(cordon, borla))
    if not con_mat: return d
    mat = np.full(len(P), 11, dtype=np.uint8)
    vivo = (y > top - 0.011) & (np.abs(x) < 0.02)
    mat[vivo] = 12; mat[(cordon < 0.002) | (borla < 0.003)] = 12
    return d, mat, np.ones(len(P))

def casco(P, con_mat=False):
    r = P - H
    d = eli(P, H + V(0, 0.05, 0.005), (0.106, 0.1, 0.122))
    d = smax(d, -(r[:, 1] - 0.012 + 0.08 * np.maximum(0, r[:, 2]) ** 2), 0.004)
    falda = smax(eli(P, H + V(0, 0.018, 0.01), (0.112, 0.03, 0.13)), -(r[:, 1] - 0.0), 0.004)
    d = smin(d, falda, 0.01)
    if not con_mat: return d
    return d, np.full(len(P), 13, dtype=np.uint8), np.ones(len(P))

# ---------------- malla ----------------
def extraer(f, lo, hi, paso, objetivo):
    t0 = time.time()
    xs, ys, zs = [np.arange(lo[i], hi[i] + paso, paso) for i in range(3)]
    G = np.stack(np.meshgrid(xs, ys, zs, indexing='ij'), -1).reshape(-1, 3)
    vol = np.concatenate([f(G[i:i + 400000]) for i in range(0, len(G), 400000)]).reshape(len(xs), len(ys), len(zs))
    v, caras, _, _ = marching_cubes(vol, 0.0, spacing=(paso, paso, paso))
    v += np.asarray(lo)
    red = 1 - objetivo / len(caras)
    if red > 0: v, caras = fast_simplification.simplify(v.astype(np.float32), caras.astype(np.int32), red)
    v = v.astype(np.float64)
    # normales por gradiente del campo (más suaves que las de la malla)
    e = paso * 0.5; n = np.zeros_like(v)
    for k in range(3):
        dv = np.zeros(3); dv[k] = e; n[:, k] = f(v + dv) - f(v - dv)
    n /= np.maximum(np.linalg.norm(n, axis=1, keepdims=True), 1e-9)
    _, mat, mez = f(v, con_mat=True)
    print(f'  {len(caras):6d} triángulos, {len(v):6d} vértices, {time.time() - t0:.1f} s')
    return v, n, mat.astype(np.uint8), np.round(np.clip(mez, 0, 1) * 255).astype(np.uint8), caras.astype(np.uint32)

def pesos(v, permitidos=None, fijo=None):
    """Pesos de piel: inversa de la distancia a cada hueso (segmento), los 4 más cercanos."""
    nh = len(HUESOS); D = np.zeros((len(v), nh))
    for i, (_, _, a, b) in enumerate(HUESOS): D[:, i] = np.maximum(cap(v, a, b, 0.0), 0.004)
    x = v[:, 0]
    for i, (nom, *_ ) in enumerate(HUESOS):
        if nom.endswith('I') and nom[:-1] in ('brazo', 'antebrazo', 'mano', 'muslo', 'pierna', 'pie'): D[x > 0.06, i] = 9
        if nom.endswith('D') and nom[:-1] in ('brazo', 'antebrazo', 'mano', 'muslo', 'pierna', 'pie'): D[x < -0.06, i] = 9
    if permitidos is not None:
        mascara = np.full(nh, 9.0); mascara[[IDX[p] for p in permitidos]] = 0; D = np.maximum(D, mascara)
    if fijo is not None: D[:] = 9; D[:, IDX[fijo]] = 0.004
    W = 1 / D ** 5
    orden = np.argsort(-W, axis=1)[:, :4]
    w = np.take_along_axis(W, orden, 1); w /= w.sum(1, keepdims=True)
    return orden.astype(np.uint8), np.round(w * 255).astype(np.uint8)

# ---------------- exportar ----------------
datos = bytearray(); manifiesto = {'huesos': [{'n': h[0], 'padre': h[1], 'p': [round(c, 4) for c in h[2]]} for h in HUESOS], 'mallas': {}}
def alinea():
    while len(datos) % 4: datos.append(0)
def guarda(nombre, v, n, mat, mez, caras, jnt, wgt):
    ent = {'v': len(v), 'i': len(caras) * 3}
    for clave, arr in (('pos', v.astype(np.float32)), ('nor', np.round(n * 127).astype(np.int8)), ('mat', mat), ('mez', mez), ('jnt', jnt), ('wgt', wgt),
                       ('idx', caras.astype(np.uint16 if len(v) < 65536 else np.uint32))):
        alinea(); ent[clave] = len(datos); datos.extend(arr.tobytes())
    ent['idx32'] = len(v) >= 65536
    manifiesto['mallas'][nombre] = ent

CAJA_CUERPO = ((-0.46, -0.01, -0.23), (0.46, 1.63, 0.21))
CAJA_CABEZA = ((-0.13, 1.43, -0.18), (0.13, 1.84, 0.16))
TRONCO = ['cadera', 'columna', 'pecho', 'cuello']
for nombre, m in (('atletico', 0.0), ('cachas', 1.0), ('muycachas', 2.0)):
    f = cuerpo_legionario(m)
    for nivel, paso, obj in (('alta', 0.0065, 26000), ('baja', 0.011, 3600)):
        if nivel == 'baja' and nombre == 'atletico': continue
        print('cuerpo', nombre, nivel); v, n, mat, mez, c = extraer(f, *CAJA_CUERPO, paso, obj)
        jnt, wgt = pesos(v); guarda(f'cuerpo_{nombre}_{nivel}', v, n, mat, mez, c, jnt, wgt)
        if nombre == 'cachas' and nivel == 'alta':
            # antebrazos para la vista en primera persona
            for l in 'ID':
                dom = jnt[:, 0]; sel = np.isin(dom, [IDX['antebrazo' + l], IDX['mano' + l]]) | ((dom == IDX['brazo' + l]) & (np.linalg.norm(v - J['codo' + l], axis=1) < 0.07))
                usados = sel[c].all(1); cc = c[usados]; mapa = -np.ones(len(v), dtype=np.int64); idx = np.unique(cc); mapa[idx] = np.arange(len(idx))
                guarda(f'antebrazo{l}', v[idx], n[idx], mat[idx], mez[idx], mapa[cc].astype(np.uint32), jnt[idx], wgt[idx])
for var in ('chilaba', 'faja'):
    print('cuerpo moro', var); v, n, mat, mez, c = extraer(cuerpo_moro(var), *CAJA_CUERPO, 0.0085, 6500); jnt, wgt = pesos(v); guarda(f'moro_{var}', v, n, mat, mez, c, jnt, wgt)
for barba in ('ninguna', 'bigote', 'corta', 'gastador'):
    f = cabeza(barba)
    for nivel, paso, obj in (('alta', 0.0021, 30000), ('baja', 0.0045, 1500)):
        print('cabeza', barba, nivel); v, n, mat, mez, c = extraer(f, *CAJA_CABEZA, paso, obj)
        jnt, wgt = pesos(v, permitidos=['pecho', 'cuello', 'cabeza']); guarda(f'cabeza_{barba}_{nivel}', v, n, mat, mez, c, jnt, wgt)
for tocado in ('turbante', 'gorro', 'capucha'):
    for barba, nar in (('corta', 1.15), ('gastador', 1.05), ('bigote', 1.25)):
        print('cabeza moro', tocado, barba); v, n, mat, mez, c = extraer(cabeza(barba, tocado=tocado, m=0.6, escala_nariz=nar), (-0.15, 1.43, -0.19), (0.15, 1.87, 0.2), 0.0032, 4200)
        jnt, wgt = pesos(v, permitidos=['pecho', 'cuello', 'cabeza']); guarda(f'moro_{tocado}_{barba}', v, n, mat, mez, c, jnt, wgt)
for nombre, f in (('gorrillo', gorrillo), ('casco', casco)):
    for nivel, paso, obj in (('alta', 0.0024, 5000), ('baja', 0.005, 500)):
        print(nombre, nivel); v, n, mat, mez, c = extraer(f, (-0.13, 1.69 if nombre == 'gorrillo' else 1.66, -0.16), (0.13, 1.86, 0.16), paso, obj)
        jnt, wgt = pesos(v, fijo='cabeza'); guarda(f'{nombre}_{nivel}', v, n, mat, mez, c, jnt, wgt)
manifiesto['cabezaCentro'] = list(H); manifiesto['ojos'] = [list(H + V(s * 0.032, 0.006, -0.082)) for s in (-1, 1)]; manifiesto['ojoI'] = list(H + V(-0.032, 0.006, -0.082)); manifiesto['juntas'] = {k: [round(x, 4) for x in v] for k, v in J.items()}
os.makedirs(SALIDA, exist_ok=True)
open(os.path.join(SALIDA, 'humanos.bin'), 'wb').write(datos)
json.dump(manifiesto, open(os.path.join(SALIDA, 'humanos.json'), 'w'))
print('total', len(datos) // 1024, 'KB')
