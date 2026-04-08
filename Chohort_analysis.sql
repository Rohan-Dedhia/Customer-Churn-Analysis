create view cohort_analysis as
with hello as (
select sales.customerkey,orderdate,sum(quantity*netprice*exchangerate)  as net_price,
countryfull,age,givenname,surname from sales
left join customer on customer.customerkey=sales.customerkey
group by sales.customerkey,orderdate,countryfull,age,givenname,surname)
select customerkey,orderdate,net_price as total_net_revenue,count(*) over (partition by customerkey order by orderdate) as number_orders,min(orderdate) over (partition by customerkey) as first_purchase_year,min(extract(year from orderdate)) over (partition by customerkey) as cohort_year,countryfull,age,givenname,surname  from hello

