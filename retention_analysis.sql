with temp as (
select orderdate,customerkey,first_purchase_year,cohort_year ,row_number() over (partition by customerkey order by orderdate desc) as pp from cohort_analysis ),
hello as(
select customerkey,orderdate as last_purchased_date,cohort_year,pp,
case 
	when orderdate<((select max(orderdate)from sales)- interval '6 months') then 'Churned' 
	else 'Active'
end as customer_status
from temp
where pp=1 and first_purchase_year<((select max(orderdate) from sales)-interval '6 months')) 
select cohort_year,customer_status,count(customerkey) as num_customers,sum(count(customerkey)) over(partition by cohort_year) as total_customers,Round(count(customerkey)/sum(count(customerkey)) over(partition by cohort_year),2) as status_percentage from hello
group by cohort_year,customer_status
