import { Hono } from "hono";
import { Prisma, PrismaClient } from "@prisma/client";
import { serve } from "@hono/node-server";

const app = new Hono();
const prismaClient = new PrismaClient();


app.post("/customers", async (c) => {
  const { name, email, phoneNumber, address } = await c.req.json();
  const customer = await prismaClient.customer.create({
    data: { name, email, phoneNumber, address },
  });
  return c.json(customer);
});

// app.get('/customers', async (c) => {
//   try {
//     const customers = await prismaClient.customer.findMany();
//     return c.json(customers);
//   } catch (error) {
//     return c.json({ error: 'Failed to fetch customers' }, 500);
//   }
// });


app.get("/customers/:id", async (c) => {
  const id = c.req.param("id");
  const customer = await prismaClient.customer.findUnique({ where: { id } });
  return c.json(customer || { error: "Customer not found" }, 404);
});


app.get("/customers/:id/orders", async (c) => {
  const id = c.req.param("id");
  const orders = await prismaClient.order.findMany({ where: { customerId: id } });
  return c.json(orders);
});


app.post("/restaurants", async (c) => {
  const { name, location } = await c.req.json();
  const restaurant = await prismaClient.restaurant.create({
    data: { name, location },
  });
  return c.json(restaurant);
});

// app.get('/restaurants', async (c) => {
//   try {
//     const restaurants = await prismaClient.restaurant.findMany();
//     return c.json(restaurants);
//   } catch (error) {
//     return c.json({ error: 'Failed to fetch restaurants' }, 500);
//   }
// });


app.get("/restaurants/:id/menu", async (c) => {
  const id = c.req.param("id");
  const menu = await prismaClient.menuItem.findMany({ where: { restaurantId: id } });
  return c.json(menu);
});

app.post("/restaurants/:id/menu", async (c) => {
  const restaurantId = c.req.param("id");
  const { name, price } = await c.req.json();
  const menuItem = await prismaClient.menuItem.create({
    data: { name, price, restaurantId },
  });
  return c.json(menuItem);
});

app.patch("/menu/:id", async (c) => {
  const id = c.req.param("id");
  const { price, isAvailable } = await c.req.json();
  const menuItem = await prismaClient.menuItem.update({
    where: { id },
    data: { price, isAvailable },
  });
  return c.json(menuItem);
});

app.post("/orders", async (c) => {
  const { customerId, restaurantId, totalPrice, items } = await c.req.json();
  const order = await prismaClient.order.create({
    data: {
      customerId,
      restaurantId,
      totalPrice,
      orderItems: {
        create: items.map(({ menuItemId, quantity }: { menuItemId: number, quantity: number }) => ({
          menuItemId,
          quantity,
        })),
      },
    },
    include: { orderItems: true },
  });
  return c.json(order);
});

// app.get('/orders', async (c) => {
//   try {
//     const orders = await prismaClient.order.findMany({
//       include: {
//         customer: false,
//         restaurant: false,
//         orderItems: {
//           include: {
//             menuItem: true,
//           },
//         },
//       },
//     });
//     return c.json(orders);
//   } catch (error) {
//     return c.json({ error: 'Failed to fetch orders' }, 500);
//   }
// });


app.get("/orders/:id", async (c) => {
  const id = c.req.param("id");
  const order = await prismaClient.order.findUnique({
    where: { id },
    include: { orderItems: true },
  });
  return c.json(order || { error: "Order not found" }, 404);
});


app.patch("/orders/:id/status", async (c) => {
  const id = c.req.param("id");
  const { status } = await c.req.json();
  const order = await prismaClient.order.update({
    where: { id },
    data: { status },
  });
  return c.json(order);
});


app.get("/restaurants/:id/revenue", async (c) => {
  const id = c.req.param("id");
  const revenue = await prismaClient.order.aggregate({
    where: { restaurantId: id, status: "COMPLETED" },
    _sum: { totalPrice: true },
  });
  return c.json({ revenue: revenue._sum.totalPrice || 0 });
});

app.get('/orders', async (c) => {
  const orders = await prismaClient.order.findMany({
    include: {
      customer: false,
      restaurant: false,
      orderItems: {
        include: {
          menuItem: true,
        },
      },
    },
  });
  return c.json(orders);
});


app.get("/customers/top", async (c) => {
  const topCustomers = await prismaClient.order.groupBy({
    by: ["customerId"],
    _count: { _all: true },
    orderBy: { _count: { customerId: "desc" } },
    take: 5,
  });
  return c.json(topCustomers);
});

app.get('/menu/top-items', async (c) => {
  const topItem = await prismaClient.orderItem.groupBy({
    by: ['menuItemId'],
    _sum: { quantity: true },
    orderBy: { _sum: { quantity: 'desc' } },
    take: 1,
  });
  if (topItem.length === 0) return c.json({ message: 'No menu items found' }, 404);

  const menuItem = await prismaClient.menuItem.findUnique({
    where: { id: topItem[0].menuItemId },
  });

  return c.json(menuItem);
});


serve(app);

console.log('server is running at http://localhost:3000/');
