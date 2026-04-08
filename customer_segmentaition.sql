
select cohort_year,sum(total_net_revenue) as total_revenue,count(distinct customerkey) as total_customers,sum(total_net_revenue)/count(distinct customerkey) as customer_revenue  from cohort_analysis
where orderdate=first_purchase_year
group by cohort_year
order by cohort_year 


