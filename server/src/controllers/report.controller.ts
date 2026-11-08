import { Request, Response } from 'express';
import prisma from '../config/prisma';

export const getProfitReport = async (req: Request, res: Response) => {
  try {
    const { period } = req.query; // 'hari' | 'minggu' | 'bulan' | 'kustom'

    const now = new Date();
    let startDate: Date | undefined;

    if (period === 'hari') {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    } else if (period === 'minggu') {
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (period === 'bulan') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    const whereClause: any = {
      paymentStatus: 'PAID',
    };

    if (startDate) {
      whereClause.createdAt = {
        gte: startDate,
      };
    }

    const orders = await prisma.order.findMany({
      where: whereClause,
      include: {
        items: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    let grossSales = 0;
    let payQrisTotal = 0;
    let payCashTotal = 0;
    let payEdcTotal = 0;
    let payQrisCount = 0;
    let payCashCount = 0;
    let payEdcCount = 0;

    const soldMap: Record<string, { id: string; nama: string; qty: number; total: number }> = {};

    orders.forEach((ord) => {
      grossSales += ord.total;

      if (ord.paymentMethod === 'qris') {
        payQrisTotal += ord.total;
        payQrisCount++;
      } else if (ord.paymentMethod === 'cash') {
        payCashTotal += ord.total;
        payCashCount++;
      } else if (ord.paymentMethod === 'edc') {
        payEdcTotal += ord.total;
        payEdcCount++;
      }

      ord.items.forEach((it) => {
        if (!soldMap[it.menuItemId]) {
          soldMap[it.menuItemId] = {
            id: it.menuItemId,
            nama: it.nama,
            qty: 0,
            total: 0,
          };
        }
        soldMap[it.menuItemId].qty += it.qty;
        soldMap[it.menuItemId].total += it.total;
      });
    });

    const discount = 0;
    const netSales = grossSales - discount;

    // Beban Operasional Proporsional Standar F&B
    const hppBahan = Math.round(netSales * 0.42);
    const gajiKaryawan = Math.round(netSales * 0.16);
    const listrikAir = Math.round(netSales * 0.05);
    const operasionalGas = Math.round(netSales * 0.06);

    const totalBeban = hppBahan + gajiKaryawan + listrikAir + operasionalGas;
    const netProfit = netSales - totalBeban;
    const profitMargin = netSales > 0 ? ((netProfit / netSales) * 100).toFixed(1) : '0';

    const txCount = orders.length;
    const aov = txCount > 0 ? Math.round(grossSales / txCount) : 0;

    const totalPayCount = txCount || 1;
    const qrisPct = txCount > 0 ? Math.round((payQrisCount / totalPayCount) * 100) : 0;
    const cashPct = txCount > 0 ? Math.round((payCashCount / totalPayCount) * 100) : 0;
    const edcPct = txCount > 0 ? 100 - (qrisPct + cashPct) : 0;

    const topSoldItems = Object.values(soldMap).sort((a, b) => b.qty - a.qty);

    return res.json({
      success: true,
      data: {
        grossSales,
        discount,
        netSales,
        hppBahan,
        gajiKaryawan,
        listrikAir,
        operasionalGas,
        totalBeban,
        netProfit,
        profitMargin,
        txCount,
        aov,
        paymentDistribution: {
          qrisTotal: payQrisTotal,
          cashTotal: payCashTotal,
          edcTotal: payEdcTotal,
          qrisPct,
          cashPct,
          edcPct,
          qrisCount: payQrisCount,
          cashCount: payCashCount,
          edcCount: payEdcCount,
        },
        topSoldItems,
        orders,
      },
    });
  } catch (error: any) {
    console.error('Error getProfitReport:', error);
    return res.status(500).json({
      success: false,
      message: 'Gagal menghitung laporan keuangan.',
    });
  }
};

